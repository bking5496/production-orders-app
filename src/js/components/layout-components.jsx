import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../core/auth';
import { 
    Calendar, Users, Search, Plus, CheckCircle, X, ClipboardList, UserCheck, 
    Settings, Edit2, Save, Trash2, Upload, Download, Activity, Package, Shield, 
    LayoutDashboard, MoreVertical, Clock, BarChart3, Menu, Wifi, WifiOff, Bell, 
    ChevronDown, LogOut, User, Home, Zap, TrendingUp, AlertTriangle, CheckCircle2
} from 'lucide-react';

// Enhanced icon map with additional icons and better organization
const iconMap = {
    // Navigation & UI
    calendar: Calendar,
    users: Users, 
    search: Search,
    plus: Plus,
    check: CheckCircle,
    checkCircle2: CheckCircle2,
    x: X,
    menu: Menu,
    home: Home,
    chevronDown: ChevronDown,
    
    // Actions
    clipboard: ClipboardList,
    userCheck: UserCheck,
    settings: Settings,
    edit: Edit2,
    save: Save,
    trash: Trash2,
    upload: Upload,
    download: Download,
    logOut: LogOut,
    
    // Status & Monitoring
    activity: Activity,
    wifi: Wifi,
    wifiOff: WifiOff,
    bell: Bell,
    alertTriangle: AlertTriangle,
    
    // Business & Production
    package: Package,
    shield: Shield,
    dashboard: LayoutDashboard,
    clock: Clock,
    barChart3: BarChart3,
    zap: Zap,
    trendingUp: TrendingUp,
    
    // User & Profile
    user: User,
    moreVertical: MoreVertical,
};

// Enhanced Icon component with better error handling and animation support
export const Icon = ({ 
    icon, 
    size = 24, 
    className = '', 
    animate = false,
    color = 'currentColor',
    ...props 
}) => {
    const LucideIcon = iconMap[icon];
    
    if (!LucideIcon) {
        console.warn(`Icon '${icon}' not found in iconMap. Available icons:`, Object.keys(iconMap));
        return <AlertTriangle size={size} className={`${className} text-yellow-500`} {...props} />;
    }
    
    const animationClass = animate ? 'transition-all duration-200 hover:scale-110' : '';
    const combinedClassName = `${className} ${animationClass}`.trim();
    
    return (
        <LucideIcon 
            size={size} 
            className={combinedClassName}
            color={color}
            {...props} 
        />
    );
};

// Enhanced Connection Status with better UI and performance metrics
const ConnectionStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [wsStatus, setWsStatus] = useState('disconnected');
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [showDetails, setShowDetails] = useState(false);
    const detailsRef = useRef(null);

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

        // Listen to WebSocket events if service is available
        if (window.EnhancedWebSocketService) {
            window.EnhancedWebSocketService.on('connected', handleWsConnected);
            window.EnhancedWebSocketService.on('authenticated', handleWsConnected);
            window.EnhancedWebSocketService.on('disconnected', handleWsDisconnected);
            window.EnhancedWebSocketService.on('reconnecting', handleWsReconnecting);
            
            const status = window.EnhancedWebSocketService.getConnectionStatus();
            setWsStatus(status.isConnected ? 'connected' : status.state);
        }

        // Click outside handler
        const handleClickOutside = (event) => {
            if (detailsRef.current && !detailsRef.current.contains(event.target)) {
                setShowDetails(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('mousedown', handleClickOutside);
            
            if (window.EnhancedWebSocketService) {
                window.EnhancedWebSocketService.off('connected', handleWsConnected);
                window.EnhancedWebSocketService.off('authenticated', handleWsConnected);
                window.EnhancedWebSocketService.off('disconnected', handleWsDisconnected);
                window.EnhancedWebSocketService.off('reconnecting', handleWsReconnecting);
            }
        };
    }, [isOnline]);

    const isFullyConnected = isOnline && wsStatus === 'connected';
    const isReconnecting = wsStatus === 'reconnecting';
    const hasError = wsStatus === 'error' || !isOnline;

    let statusConfig;
    
    if (isReconnecting) {
        statusConfig = {
            color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            text: 'Reconnecting',
            icon: 'wifi',
            iconColor: 'text-yellow-600',
            pulse: true
        };
    } else if (isFullyConnected) {
        statusConfig = {
            color: 'bg-green-100 text-green-800 border-green-200',
            text: 'Live',
            icon: 'wifi',
            iconColor: 'text-green-600',
            pulse: false
        };
    } else if (hasError) {
        statusConfig = {
            color: 'bg-red-100 text-red-800 border-red-200',
            text: isOnline ? 'Error' : 'Offline',
            icon: 'wifiOff',
            iconColor: 'text-red-600',
            pulse: false
        };
    } else {
        statusConfig = {
            color: 'bg-blue-100 text-blue-800 border-blue-200',
            text: 'Connecting',
            icon: 'wifi',
            iconColor: 'text-blue-600',
            pulse: true
        };
    }

    return (
        <div className="relative" ref={detailsRef}>
            <button
                onClick={() => setShowDetails(!showDetails)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-all duration-200 hover:shadow-sm ${statusConfig.color}`}
            >
                <Icon 
                    icon={statusConfig.icon} 
                    size={12} 
                    className={`${statusConfig.iconColor} ${statusConfig.pulse ? 'animate-pulse' : ''}`}
                />
                <span className="font-medium">{statusConfig.text}</span>
                <span className="text-gray-500 hidden lg:inline text-xs">
                    {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>

            {showDetails && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Connection Status</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${statusConfig.color}`}>
                                {statusConfig.text}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                                <div className="text-gray-500">Network</div>
                                <div className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                                    {isOnline ? 'Online' : 'Offline'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-gray-500">WebSocket</div>
                                <div className={`font-medium ${
                                    wsStatus === 'connected' ? 'text-green-600' : 
                                    wsStatus === 'reconnecting' ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                    {wsStatus.charAt(0).toUpperCase() + wsStatus.slice(1)}
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-2 border-t border-gray-200">
                            <div className="text-xs text-gray-500">
                                Last updated: {lastUpdate.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Enhanced User Menu with profile options and better UX
const UserMenu = () => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    const userInitials = user.username ? user.username.slice(0, 2).toUpperCase() : 'UN';
    const roleColors = {
        admin: 'bg-red-500',
        manager: 'bg-blue-500',
        supervisor: 'bg-green-500',
        operator: 'bg-gray-500'
    };
    
    const avatarColor = roleColors[user.role] || 'bg-gray-500';

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="User menu"
            >
                <div className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white shadow-sm ring-2 ring-white`}>
                    <span className="text-sm font-bold">{userInitials}</span>
                </div>
                <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">{user.username}</p>
                    <p className="text-xs text-gray-500 capitalize flex items-center">
                        <span className={`w-2 h-2 ${avatarColor} rounded-full mr-1.5`}></span>
                        {user.role}
                    </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 ${avatarColor} rounded-full flex items-center justify-center text-white`}>
                                <span className="text-xs font-bold">{userInitials}</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="py-1">
                        <button 
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                            onClick={() => setIsOpen(false)}
                        >
                            <User className="w-4 h-4 mr-3 text-gray-400" />
                            View Profile
                        </button>
                        
                        <button 
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                            onClick={() => setIsOpen(false)}
                        >
                            <Settings className="w-4 h-4 mr-3 text-gray-400" />
                            Settings
                        </button>
                        
                        <div className="border-t border-gray-100 my-1"></div>
                        
                        <button 
                            onClick={() => {
                                logout();
                                setIsOpen(false);
                            }} 
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                        >
                            <LogOut className="w-4 h-4 mr-3" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Enhanced Header with notifications, search, and better mobile support
const Header = ({ onMenuClick, notifications = [] }) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const notificationRef = useRef(null);
    const searchRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearch(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 relative z-40">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={onMenuClick} 
                            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors duration-200"
                            aria-label="Open navigation menu"
                        >
                            <Menu size={20} />
                        </button>
                        
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 hidden sm:block">Production Management</h1>
                                <h1 className="text-lg font-bold text-gray-900 sm:hidden">PMS</h1>
                            </div>
                        </div>
                    </div>
          
                    <div className="hidden md:flex flex-1 max-w-md mx-8" ref={searchRef}>
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search orders, machines, users..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                onFocus={() => setShowSearch(true)}
                            />
                            
                            {showSearch && (
                                <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                                    <div className="px-4 py-2 text-xs text-gray-500">
                                        Recent searches appear here
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <ConnectionStatus />
                        
                        <button 
                            className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                            onClick={() => setShowSearch(!showSearch)}
                        >
                            <Search size={18} />
                        </button>
                        
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                                aria-label="Notifications"
                            >
                                <Bell size={18} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                                    <div className="p-4 border-b border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                                    {unreadCount} new
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                                <p className="text-gray-500 text-sm">No notifications yet</p>
                                            </div>
                                        ) : (
                                            notifications.slice(0, 10).map((notification, index) => (
                                                <div key={index} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                                                    !notification.read ? 'bg-blue-50' : ''
                                                }`}>
                                                    <div className="flex items-start space-x-3">
                                                        <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                                                            notification.type === 'error' ? 'bg-red-500' :
                                                            notification.type === 'warning' ? 'bg-yellow-500' :
                                                            notification.type === 'success' ? 'bg-green-500' :
                                                            'bg-blue-500'
                                                        }`}></div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                                            <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    
                                    {notifications.length > 0 && (
                                        <div className="p-4 border-t border-gray-100">
                                            <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                                                View all notifications
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <UserMenu />
                    </div>
                </div>
            </div>
            
            {showSearch && (
                <div className="md:hidden px-4 py-3 border-t border-gray-200 bg-gray-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            autoFocus
                        />
                    </div>
                </div>
            )}
        </header>
    );
};

// Enhanced Sidebar
const Sidebar = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [activeItem, setActiveItem] = useState(window.location.pathname);

    const allNavigation = [
        { name: 'Dashboard', href: '/', icon: 'dashboard', priority: 'critical', roles: ['operator', 'supervisor', 'manager', 'admin'] },
        { name: 'Production Monitor', href: '/production', icon: 'activity', priority: 'critical', roles: ['operator', 'supervisor', 'manager', 'admin'] },
        { name: 'Orders', href: '/orders', icon: 'package', priority: 'daily', roles: ['operator', 'supervisor', 'manager', 'admin'] },
        { name: 'Machines', href: '/machines', icon: 'settings', priority: 'daily', roles: ['operator', 'supervisor', 'manager', 'admin'] },
        { name: 'Labor Layout', href: '/labour-layout', icon: 'users', priority: 'daily', roles: ['supervisor', 'manager', 'admin'] },
        { name: 'Labor Planner', href: '/labor-planner', icon: 'calendar', priority: 'daily', roles: ['supervisor', 'manager', 'admin'] },
        { name: 'Attendance Register', href: '/attendance-register', icon: 'userCheck', priority: 'daily', roles: ['supervisor', 'manager', 'admin'] },
        { name: 'Maturation Room', href: '/maturation-room', icon: 'package', priority: 'daily', roles: ['operator', 'supervisor', 'manager', 'admin'] },
        { name: 'Analytics', href: '/analytics', icon: 'barChart3', priority: 'management', roles: ['manager', 'admin'] },
        { name: 'Shift Reports', href: '/shift-reports', icon: 'clock', priority: 'management', roles: ['supervisor', 'manager', 'admin'] },
        { name: 'Settings', href: '/settings', icon: 'settings', priority: 'management', roles: ['supervisor', 'manager', 'admin'] },
        { name: 'Admin & Users', href: '/admin', icon: 'shield', priority: 'management', roles: ['admin'] },
    ];

    const navigation = allNavigation.filter(item => 
        item.roles.includes(user?.role || 'operator')
    );

    const sections = [
        { title: 'Critical', items: navigation.filter(item => item.priority === 'critical') },
        { title: 'Daily Operations', items: navigation.filter(item => item.priority === 'daily') },
        { title: 'Management', items: navigation.filter(item => item.priority === 'management') }
    ];

    const handleNavigate = (e, href) => {
        e.preventDefault();
        setActiveItem(href);
        window.history.pushState({}, '', href);
        const navEvent = new PopStateEvent('popstate');
        window.dispatchEvent(navEvent);
        if (onClose) onClose();
    };

    const userInitials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'UN';
    const roleColors = {
        admin: 'from-red-500 to-red-600',
        manager: 'from-blue-500 to-blue-600', 
        supervisor: 'from-green-500 to-green-600',
        operator: 'from-gray-500 to-gray-600'
    };
    const gradientColor = roleColors[user?.role] || 'from-gray-500 to-gray-600';

    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden transition-all duration-300" 
                    onClick={onClose}
                ></div>
            )}

            <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-gray-800 to-gray-900 text-white transform transition-all duration-300 lg:static lg:inset-0 ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0`}>
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700/50 bg-gray-800/50">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <span className="text-white font-bold text-lg">PMS</span>
                            <div className="text-xs text-gray-400">v2.0.0</div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="lg:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-200"
                        aria-label="Close navigation menu"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="px-4 py-4 border-b border-gray-700/50 bg-gray-800/30">
                    <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 bg-gradient-to-br ${gradientColor} rounded-xl flex items-center justify-center ring-2 ring-white/20 shadow-lg`}>
                            <span className="text-sm font-bold text-white">{userInitials}</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{user?.username}</p>
                            <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 bg-gradient-to-r ${gradientColor} rounded-full`}></span>
                                <p className="text-xs text-gray-300 capitalize">{user?.role}</p>
                            </div>
                        </div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Online"></div>
                    </div>
                </div>
                
                <nav className="flex-1 px-3 py-4 overflow-y-auto">
                    {sections.map((section) => (
                        section.items.length > 0 && (
                            <div key={section.title} className="mb-6">
                                <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    {section.title}
                                </h3>
                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const isActive = activeItem === item.href;
                                        return (
                                            <a
                                                key={item.name}
                                                href={item.href}
                                                onClick={(e) => handleNavigate(e, item.href)}
                                                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 min-h-[44px] touch-manipulation ${
                                                    isActive 
                                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white hover:shadow-md'
                                                }`}
                                            >
                                                <Icon icon={item.icon} size={18} className="mr-3 flex-shrink-0" />
                                                <span className="truncate">{item.name}</span>
                                                {isActive && (
                                                    <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                                )}
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    ))}
                </nav>
                
                <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>© 2025 PMS</span>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span>System Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// Enhanced MainLayout
export default function MainLayout({ 
    children, 
    loading = false, 
    error = null,
    notifications = []
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    const mockNotifications = notifications.length > 0 ? notifications : [
        {
            id: 1,
            title: 'Production Alert',
            message: 'Machine LQ-001 requires maintenance',
            type: 'warning',
            time: '5 minutes ago',
            read: false
        },
        {
            id: 2, 
            title: 'Order Completed',
            message: 'Order #GEN014 has been completed successfully',
            type: 'success',
            time: '1 hour ago',
            read: true
        }
    ];
    
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && sidebarOpen) {
                setSidebarOpen(false);
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [sidebarOpen]);
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-blue-600 animate-pulse" />
                        </div>
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-gray-900">Loading Production System</h2>
                    <p className="mt-2 text-sm text-gray-600">Please wait while we initialize the application...</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 text-center">
                    <div>
                        <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Something went wrong</h2>
                        <p className="mt-2 text-sm text-gray-600">We're sorry, but something unexpected happened.</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-800 font-mono">{error?.message || 'Unknown error occurred'}</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header onMenuClick={() => setSidebarOpen(true)} notifications={mockNotifications} />
                
                <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-white">
                    <div className="py-6 transition-all duration-300">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="mb-6">
                                <nav className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Home className="w-4 h-4" />
                                    <span>/</span>
                                    <span className="text-gray-900 font-medium">
                                        {window.location.pathname === '/' ? 'Dashboard' : 
                                         window.location.pathname.slice(1).split('-').map(word => 
                                           word.charAt(0).toUpperCase() + word.slice(1)
                                         ).join(' ')}
                                    </span>
                                </nav>
                            </div>
                            
                            <div className="animate-in slide-in-from-bottom-4 duration-300">
                                {children}
                            </div>
                        </div>
                    </div>
                </main>
                
                <footer className="bg-white border-t border-gray-200 px-4 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                            <span>© 2025 Production Management System</span>
                            <span>•</span>
                            <span>Version 2.0.0</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span>Last updated: {new Date().toLocaleDateString()}</span>
                            <div className="flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                <span>System Operational</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}