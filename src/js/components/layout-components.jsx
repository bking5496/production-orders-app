import React, { useState, useEffect } from 'react';
import { useAuth } from '../core/auth';
import { Calendar, Users, Search, Plus, CheckCircle, X, ClipboardList, UserCheck, Settings, Edit2, Save, Trash2, Upload, Download, Activity, Package, Shield, LayoutDashboard, MoreVertical, Clock, BarChart3, Menu, Wifi, WifiOff } from 'lucide-react';

// Create a map of icons to avoid a large switch statement
const iconMap = {
    calendar: Calendar,
    users: Users,
    search: Search,
    plus: Plus,
    check: CheckCircle,
    x: X,
    clipboard: ClipboardList,
    userCheck: UserCheck,
    settings: Settings,
    edit: Edit2,
    save: Save,
    trash: Trash2,
    upload: Upload,
    download: Download,
    activity: Activity,
    package: Package,
    shield: Shield,
    dashboard: LayoutDashboard,
    moreVertical: MoreVertical,
    clock: Clock,
    barChart3: BarChart3,
    menu: Menu,
    wifi: Wifi,
    wifiOff: WifiOff,
};

// EXPORT the Icon component so other files can use it
export const Icon = ({ icon, size = 24, className = '' }) => {
    const LucideIcon = iconMap[icon];
    if (!LucideIcon) {
        // Return a default icon or null if the icon name is invalid
        return <Users size={size} className={className} />; // Default fallback
    }
    return <LucideIcon size={size} className={className} />;
};

// Connection Status Indicator Component with WebSocket support
const ConnectionStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [wsStatus, setWsStatus] = useState('disconnected');
    const [lastUpdate, setLastUpdate] = useState(new Date());

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setLastUpdate(new Date());
        };
        const handleOffline = () => {
            setIsOnline(false);
            setLastUpdate(new Date());
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // WebSocket event handlers
        const handleWsConnected = () => {
            setWsStatus('connected');
            setLastUpdate(new Date());
        };
        const handleWsDisconnected = () => {
            setWsStatus('disconnected');
            setLastUpdate(new Date());
        };
        const handleWsReconnecting = () => {
            setWsStatus('reconnecting');
            setLastUpdate(new Date());
        };
        const handleWsError = () => {
            setWsStatus('error');
            setLastUpdate(new Date());
        };

        // Listen to WebSocket events if service is available
        if (window.WebSocketService) {
            window.WebSocketService.on('connected', handleWsConnected);
            window.WebSocketService.on('authenticated', handleWsConnected);
            window.WebSocketService.on('disconnected', handleWsDisconnected);
            window.WebSocketService.on('reconnecting', handleWsReconnecting);
            window.WebSocketService.on('error', handleWsError);
            
            // Get initial status
            const status = window.WebSocketService.getStatus();
            setWsStatus(status.isConnected ? 'connected' : status.state);
        }

        // Update timestamp every minute when online
        const interval = setInterval(() => {
            if (isOnline) {
                setLastUpdate(new Date());
            }
        }, 60000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
            
            // Clean up WebSocket listeners
            if (window.WebSocketService) {
                window.WebSocketService.off('connected', handleWsConnected);
                window.WebSocketService.off('authenticated', handleWsConnected);
                window.WebSocketService.off('disconnected', handleWsDisconnected);
                window.WebSocketService.off('reconnecting', handleWsReconnecting);
                window.WebSocketService.off('error', handleWsError);
            }
        };
    }, [isOnline]);

    // Determine overall connection status
    const isFullyConnected = isOnline && wsStatus === 'connected';
    const isReconnecting = wsStatus === 'reconnecting';
    const hasError = wsStatus === 'error' || !isOnline;

    let statusColor, statusText, statusIcon;
    
    if (isReconnecting) {
        statusColor = 'bg-yellow-100 text-yellow-800';
        statusText = 'Reconnecting...';
        statusIcon = 'wifi';
    } else if (isFullyConnected) {
        statusColor = 'bg-green-100 text-green-800';
        statusText = 'Live';
        statusIcon = 'wifi';
    } else if (hasError) {
        statusColor = 'bg-red-100 text-red-800';
        statusText = isOnline ? 'Connection Error' : 'Offline';
        statusIcon = 'wifiOff';
    } else {
        statusColor = 'bg-gray-100 text-gray-800';
        statusText = 'Connecting...';
        statusIcon = 'wifi';
    }

    return (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${statusColor}`}>
            <Icon 
                icon={statusIcon} 
                size={12} 
                className={`${isFullyConnected ? 'text-green-600' : hasError ? 'text-red-600' : 'text-yellow-600'} ${isReconnecting ? 'animate-pulse' : ''}`}
            />
            <span>{statusText}</span>
            <span className="text-gray-500 hidden sm:inline">
                {lastUpdate.toLocaleTimeString()}
            </span>
        </div>
    );
};


const UserMenu = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-3 focus:outline-none">
        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-lg font-semibold text-gray-700">{user.username ? user.username.charAt(0).toUpperCase() : 'U'}</span>
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-700">{user.username}</p>
          <p className="text-xs text-gray-500 capitalize">{user.role}</p>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
          <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

const Header = ({ onMenuClick }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu button with touch-friendly size */}
          <button 
            onClick={onMenuClick} 
            className="lg:hidden p-3 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open navigation menu"
          >
            <Icon icon="menu" size={24} />
          </button>
          
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900 hidden sm:block">Production Management System</h1>
            <h1 className="text-lg font-semibold text-gray-900 sm:hidden">PMS</h1>
            <ConnectionStatus />
          </div>
          
          <UserMenu />
        </div>
      </div>
    </header>
  );
};


const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const allNavigation = [
    { name: 'Dashboard', href: '/', icon: 'dashboard', priority: 'critical', roles: ['operator', 'supervisor', 'manager', 'admin'] },
    { name: 'Production Monitor', href: '/production', icon: 'activity', priority: 'critical', roles: ['operator', 'supervisor', 'manager', 'admin'] },
    { name: 'Orders', href: '/orders', icon: 'package', priority: 'daily', roles: ['operator', 'supervisor', 'manager', 'admin'] },
    { name: 'Machines', href: '/machines', icon: 'settings', priority: 'daily', roles: ['operator', 'supervisor', 'manager', 'admin'] },
    { name: 'Labor Layout', href: '/labour-layout', icon: 'users', priority: 'daily', roles: ['supervisor', 'manager', 'admin'] },
    { name: 'Labor Planner', href: '/labor-planner', icon: 'calendar', priority: 'daily', roles: ['supervisor', 'manager', 'admin'] },
    { name: 'Analytics', href: '/analytics', icon: 'barChart3', priority: 'management', roles: ['manager', 'admin'] },
    { name: 'Shift Reports', href: '/shift-reports', icon: 'clock', priority: 'management', roles: ['supervisor', 'manager', 'admin'] },
    { name: 'Users', href: '/users', icon: 'users', priority: 'management', roles: ['admin'] },
    { name: 'Settings', href: '/settings', icon: 'settings', priority: 'management', roles: ['supervisor', 'manager', 'admin'] },
    { name: 'Admin', href: '/admin', icon: 'shield', priority: 'management', roles: ['admin'] },
  ];

  // Filter navigation based on user role
  const navigation = allNavigation.filter(item => 
    item.roles.includes(user?.role || 'operator')
  );

  // Group navigation by priority
  const criticalItems = navigation.filter(item => item.priority === 'critical');
  const dailyItems = navigation.filter(item => item.priority === 'daily');
  const managementItems = navigation.filter(item => item.priority === 'management');

  const handleNavigate = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    const navEvent = new PopStateEvent('popstate');
    window.dispatchEvent(navEvent);
    if (onClose) onClose();
  };

  const renderNavSection = (items, title) => {
    if (items.length === 0) return null;
    
    return (
      <div className="mb-4">
        {title && (
          <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {title}
          </h3>
        )}
        <div className="space-y-1">
          {items.map((item) => (
            <a
              key={item.name}
              href={item.href}
              onClick={(e) => handleNavigate(e, item.href)}
              className={`group flex items-center px-3 py-3 text-sm font-medium rounded-md hover:bg-gray-700 hover:text-white transition-colors min-h-[44px] touch-manipulation ${
                window.location.pathname === item.href ? 'bg-gray-900 text-white' : 'text-gray-300'
              }`}
            >
              <Icon icon={item.icon} size={18} className="mr-3 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
        {/* Overlay for mobile */}
        {isOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose}></div>}

        <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 text-white transform transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
                <span className="text-white font-semibold text-xl">PMS</span>
                {/* Close button for mobile */}
                <button 
                  onClick={onClose}
                  className="lg:hidden p-2 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close navigation menu"
                >
                  <Icon icon="x" size={20} />
                </button>
            </div>
            
            {/* User info section */}
            <div className="px-4 py-3 border-b border-gray-700">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-semibold text-white">
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user?.username}</p>
                  <p className="text-xs text-gray-300 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 px-2 py-4 overflow-y-auto">
                {renderNavSection(criticalItems, 'Critical')}
                {renderNavSection(dailyItems, 'Daily Operations')}
                {renderNavSection(managementItems, 'Management')}
            </nav>
        </div>
    </>
  );
};


// EXPORT MainLayout as the default
export default function MainLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (
        <div className="h-screen flex overflow-hidden bg-gray-100">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
