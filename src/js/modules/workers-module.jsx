import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Search, 
  Edit2, 
  CheckCircle,
  X,
  RefreshCw,
  Plus,
  Settings
} from 'lucide-react';
import API from '../core/api';
import { 
  TouchButton, 
  TouchDropdown,
  ResponsiveTable,
  useDeviceDetection,
  useTouchGestures,
  usePerformanceOptimization,
  Modal
} from '../components/mobile-responsive-utils.jsx';
import { useHighContrastTheme } from '../components/mobile-theme-system.jsx';

const WorkersModule = ({ assignments = [], onShowNotification }) => {
  const [employees, setEmployees] = useState([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [editingWorker, setEditingWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mobile detection and performance optimization
  const { isMobile, isTablet } = useDeviceDetection();
  const { shouldReduceAnimations } = usePerformanceOptimization();
  const { theme } = useHighContrastTheme();

  // Search input ref for touch gestures
  const searchRef = useRef(null);
  const containerRef = useRef(null);

  // Touch gesture support
  useTouchGestures(containerRef.current, {
    onLongPress: () => {
      // Focus search input on long press
      if (searchRef.current) {
        searchRef.current.focus();
      }
    }
  });

  // Fetch employees data
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await API.get('/planner/employees');
      setEmployees(response || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to load employee data');
      onShowNotification?.('Failed to load employee data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Filter workers based on search
  const filteredWorkers = useMemo(() => {  
    if (!workerSearch) return employees;
    
    return employees.filter(employee => {
      const searchTerm = workerSearch.toLowerCase();
      const fullName = employee.fullName?.toLowerCase() || '';
      const username = employee.username?.toLowerCase() || '';
      const employeeCode = employee.employee_code?.toLowerCase() || '';
      const role = employee.role?.toLowerCase() || '';
      const company = employee.company?.toLowerCase() || '';
      
      return fullName.includes(searchTerm) ||
             username.includes(searchTerm) ||
             employeeCode.includes(searchTerm) ||
             role.includes(searchTerm) ||
             company.includes(searchTerm);
    });
  }, [employees, workerSearch]);

  // Get role statistics
  const roleStats = useMemo(() => {
    const roles = ['supervisor', 'operator', 'packer', 'technician'];
    return roles.map(role => ({
      role,
      count: filteredWorkers.filter(e => e.role === role).length,
      assigned: assignments.filter(a => {
        const employee = employees.find(emp => emp.id === a.employee_id);
        return employee?.role === role;
      }).length
    }));
  }, [filteredWorkers, assignments, employees]);

  // Load data on mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Role color mapping
  const getRoleColors = (role) => {
    const colorMap = {
      supervisor: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'bg-purple-100',
        iconText: 'text-purple-600',
        title: 'text-purple-900',
        count: 'text-purple-700',
        badge: 'bg-purple-100 text-purple-700'
      },
      operator: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'bg-green-100',
        iconText: 'text-green-600',
        title: 'text-green-900',
        count: 'text-green-700',
        badge: 'bg-green-100 text-green-700'
      },
      packer: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'bg-blue-100',
        iconText: 'text-blue-600',
        title: 'text-blue-900',
        count: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-700'
      },
      technician: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'bg-amber-100',
        iconText: 'text-amber-600',
        title: 'text-amber-900',
        count: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-700'
      },
      default: {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        icon: 'bg-slate-100',
        iconText: 'text-slate-600',
        title: 'text-slate-900',
        count: 'text-slate-700',
        badge: 'bg-slate-100 text-slate-700'
      }
    };
    return colorMap[role] || colorMap.default;
  };

  // Mobile-optimized worker card
  const WorkerCard = ({ employee }) => {
    const isAssigned = assignments.some(a => a.employee_id === employee.id);
    const roleColors = getRoleColors(employee.role);

    return (
      <div className={`${theme.card} rounded-xl border-2 p-4 ${
        isAssigned 
          ? 'border-green-200 bg-green-50' 
          : 'border-slate-200 hover:border-slate-300'
      } ${!shouldReduceAnimations ? 'transition-all duration-300 hover:shadow-lg' : ''}`}>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-medium text-sm">
                {employee.employee_code?.slice(0, 2) || employee.username?.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-base truncate">
                {employee.fullName || 
                 (employee.username ? 
                   employee.username.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                   'N/A')}
              </p>
              <p className="text-sm text-slate-600 truncate">
                {employee.employee_code}
              </p>
            </div>
          </div>
          
          <TouchButton
            onClick={() => setEditingWorker(employee)}
            variant="ghost"
            size="sm"
            className="min-w-[44px] min-h-[44px] shrink-0"
          >
            <Edit2 className="w-4 h-4" />
          </TouchButton>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Role:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors.badge}`}>
              {employee.role?.charAt(0).toUpperCase() + employee.role?.slice(1)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Company:</span>
            <span className="text-sm font-medium text-slate-900 truncate ml-2">
              {employee.company || 'N/A'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Status:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isAssigned 
                ? 'bg-green-100 text-green-700' 
                : 'bg-slate-100 text-slate-700'
            }`}>
              {isAssigned ? 'Assigned' : 'Available'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Role statistics card
  const RoleStatCard = ({ role, count, assigned }) => {
    const colors = getRoleColors(role);
    
    return (
      <div className={`${colors.bg} rounded-xl p-4 border ${colors.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${colors.icon} rounded-xl flex items-center justify-center`}>
            <Users className={`w-5 h-5 ${colors.iconText}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${colors.title} capitalize`}>
              {role}s
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-lg font-bold ${colors.count}`}>{count}</p>
              {assigned > 0 && (
                <span className="text-xs text-slate-500">
                  ({assigned} assigned)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-6">
        <div className={`${theme.card} rounded-xl shadow-sm border p-6`}>
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 p-4 md:p-6">
      <div className={`${theme.card} rounded-xl shadow-sm border p-4 md:p-6`}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">Team Management</h2>
              <p className="text-slate-600 text-sm">Manage employee information and roles</p>
              {isMobile && (
                <p className="text-slate-400 text-xs mt-1">Long press to focus search</p>
              )}
            </div>
          </div>
          
          {/* Search and Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search employees..."
                value={workerSearch}
                onChange={e => setWorkerSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64 text-sm"
              />
            </div>
            
            <TouchButton
              onClick={() => fetchEmployees()}
              variant="ghost"
              size="sm"
              className="min-w-[44px] min-h-[44px] shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </TouchButton>
          </div>
        </div>

        {/* Role Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {roleStats.map(({ role, count, assigned }) => (
            <RoleStatCard 
              key={role} 
              role={role} 
              count={count} 
              assigned={assigned}
            />
          ))}
        </div>

        {/* Workers Grid */}
        {filteredWorkers.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Team Members ({filteredWorkers.length})
              </h3>
              {workerSearch && (
                <TouchButton
                  onClick={() => setWorkerSearch('')}
                  variant="ghost" 
                  size="sm"
                >
                  Clear Search
                </TouchButton>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkers.map(employee => (
                <WorkerCard key={employee.id} employee={employee} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              {workerSearch ? 'No employees found' : 'No employees available'}
            </h3>
            <p className="text-slate-500 mb-4">
              {workerSearch 
                ? 'No employees match your search criteria' 
                : 'No employee data available'}
            </p>
            {workerSearch ? (
              <TouchButton 
                onClick={() => setWorkerSearch('')}
                variant="primary"
                size="sm"
              >
                Clear Search
              </TouchButton>
            ) : (
              <p className="text-sm text-slate-400">
                Contact your administrator to add employees
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Edit Worker Modal */}
        {editingWorker && (
          <Modal 
            title="Edit Employee" 
            onClose={() => setEditingWorker(null)}
            size="md"
          >
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-medium text-lg">
                    {editingWorker.employee_code?.slice(0, 2) || editingWorker.username?.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingWorker.fullName || editingWorker.username}
                </h3>
                <p className="text-slate-600">{editingWorker.employee_code}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Role
                  </label>
                  <span className={`px-3 py-2 rounded-lg text-sm font-medium ${getRoleColors(editingWorker.role).badge}`}>
                    {editingWorker.role?.charAt(0).toUpperCase() + editingWorker.role?.slice(1)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company
                  </label>
                  <p className="text-slate-900">{editingWorker.company || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Status
                  </label>
                  <span className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    assignments.some(a => a.employee_id === editingWorker.id)
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {assignments.some(a => a.employee_id === editingWorker.id) ? 'Currently Assigned' : 'Available'}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <TouchButton
                  onClick={() => setEditingWorker(null)}
                  variant="secondary"
                  className="flex-1"
                >
                  Close
                </TouchButton>
                <TouchButton
                  onClick={() => {
                    // TODO: Implement edit functionality
                    onShowNotification('Edit functionality coming soon', 'info');
                    setEditingWorker(null);
                  }}
                  variant="primary"
                  className="flex-1"
                >
                  Edit Details
                </TouchButton>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default WorkersModule;