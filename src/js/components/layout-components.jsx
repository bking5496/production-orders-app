import React, { useState } from 'react';
import { useAuth } from '../core/auth';
import { Calendar, Users, Search, Plus, CheckCircle, X, ClipboardList, UserCheck, Settings, Edit2, Save, Trash2, Upload, Download, Activity, Package, Shield, LayoutDashboard, MoreVertical } from 'lucide-react';

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
          {/* Mobile menu button */}
           <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-700">
                <Icon icon="menu" size={24} />
           </button>
          <h1 className="text-xl font-semibold text-gray-900">Production Management System</h1>
          <UserMenu />
        </div>
      </div>
    </header>
  );
};


const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: 'dashboard' },
    { name: 'Production Monitor', href: '/production', icon: 'activity' },
    { name: 'Orders', href: '/orders', icon: 'package' },
    { name: 'Machines', href: '/machines', icon: 'settings' },
    { name: 'Labor Layout', href: '/labour-layout', icon: 'users' },
    { name: 'Labor Planner', href: '/labor-planner', icon: 'calendar' },
    { name: 'Analytics', href: '/analytics', icon: 'barChart3' },
    { name: 'Users', href: '/users', icon: 'users' },
    { name: 'Settings', href: '/settings', icon: 'settings' },
    { name: 'Admin', href: '/admin', icon: 'shield' },
  ];

  const handleNavigate = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    const navEvent = new PopStateEvent('popstate');
    window.dispatchEvent(navEvent);
    if (onClose) onClose();
  };

  return (
    <>
        {/* Overlay for mobile */}
        {isOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose}></div>}

        <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 text-white transform transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
            <div className="flex items-center h-16 px-4 border-b border-gray-700">
                <span className="text-white font-semibold text-xl">PMS</span>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => (
                    <a
                        key={item.name}
                        href={item.href}
                        onClick={(e) => handleNavigate(e, item.href)}
                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md hover:bg-gray-700 hover:text-white transition-colors ${
                          window.location.pathname === item.href ? 'bg-gray-900 text-white' : 'text-gray-300'
                        }`}
                    >
                        <Icon icon={item.icon} size={16} className="mr-3" />
                        {item.name}
                    </a>
                ))}
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
