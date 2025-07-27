import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// Import EventBus first (before other modules that use it)
import './js/core/event-bus.js';

// Import core services
import { AuthProvider, useAuth } from './js/core/auth.js';
import Router, { useRouter } from './js/core/router.js';

// Import layout and auth components (with .jsx extension)
import MainLayout from './js/components/layout-components.jsx';
import LoginForm from './js/components/auth-components.jsx';

// Import page components (with .jsx extension)
import Dashboard from "./js/components/dashboard.jsx";
import ProductionDashboard from "./js/components/production-dashboard.jsx";
import OrdersPage from "./js/components/orders.jsx";
import MachinesPage from "./js/components/machines.jsx";
import AnalyticsPage from "./js/components/analytics.jsx";
import UsersPage from "./js/components/users.jsx";
import { SettingsPage } from "./js/modules/settings-module.jsx";
import AdminPanel from "./js/components/admin.jsx";
import LabourLayout from "./js/components/labour-layout.jsx";
import { LaborManagementSystem } from './js/components/labor-planner.jsx';

// Define the routes for the application
const routes = [
    { path: '/', component: Dashboard, title: 'Dashboard' },
    { path: '/production', component: ProductionDashboard, title: 'Production Monitor' },
    { path: '/labour-layout', component: LabourLayout, title: 'Labour Layout' },
    { path: '/labor-planner', component: LaborManagementSystem, name: 'Labor Planner' },
    { path: '/orders', component: OrdersPage, title: 'Production Orders' },
    { path: '/machines', component: MachinesPage, title: 'Machine Management' },
    { path: '/analytics', component: AnalyticsPage, title: 'Analytics & Reports' },
    { path: '/users', component: UsersPage, title: 'User Management' },
    { path: '/settings', component: SettingsPage, title: 'Settings' },
    { path: '/admin', component: AdminPanel, title: 'Admin Panel' },
];

// Initialize the router
routes.forEach(route => Router.addRoute(route));
Router.init();

function App() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    // Use EventBus instead of Router.on
    const handleRouteChange = (data) => setCurrentPath(data.path);
    
    const unsubscribe = window.EventBus.on('router:navigation', handleRouteChange);
    
    return () => {
      unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-xl">Loading Application...</div>;
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const route = routes.find(r => r.path === currentPath);
  const ComponentToRender = route ? route.component : Dashboard;
  const pageTitle = route ? route.name : 'Dashboard';

  return (
    <MainLayout title={pageTitle}>
      <ComponentToRender />
    </MainLayout>
  );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
