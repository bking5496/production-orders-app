import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ClipboardList, 
  UserCheck, 
  Users, 
  Calendar,
  Download,
  RefreshCw,
  Settings,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import API from '../core/api';
import { 
  TouchButton, 
  TouchDropdown,
  ResponsiveTable,
  useDeviceDetection,
  useTouchGestures,
  usePerformanceOptimization,
  TabNavigation
} from './mobile-responsive-utils.jsx';
import { useHighContrastTheme } from './mobile-theme-system.jsx';
import AttendanceModule from '../modules/attendance-module.jsx';
import WorkersModule from '../modules/workers-module.jsx';

const getCurrentSASTDateString = () => {
  const now = new Date();
  now.setHours(now.getHours() + 2); // Convert to SAST (UTC+2)
  return now.toISOString().split('T')[0];
};

const LaborPlannerContainer = () => {
  const [currentView, setCurrentView] = useState('planning');
  const [machines, setMachines] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [error, setError] = useState(null);

  // Planning state
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedShift, setSelectedShift] = useState('day');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Check URL params for date
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    if (dateParam) {
      return dateParam;
    }
    return getCurrentSASTDateString();
  });

  // Mobile detection and performance optimization
  const { isMobile, isTablet } = useDeviceDetection();
  const { shouldReduceAnimations } = usePerformanceOptimization();
  const { theme } = useHighContrastTheme();

  // Container ref for touch gestures
  const containerRef = useRef(null);

  // Touch gesture support for tab switching
  useTouchGestures(containerRef.current, {
    onSwipeLeft: () => {
      const tabs = ['planning', 'attendance', 'workers'];
      const currentIndex = tabs.indexOf(currentView);
      if (currentIndex < tabs.length - 1) {
        setCurrentView(tabs[currentIndex + 1]);
      }
    },
    onSwipeRight: () => {
      const tabs = ['planning', 'attendance', 'workers'];
      const currentIndex = tabs.indexOf(currentView);
      if (currentIndex > 0) {
        setCurrentView(tabs[currentIndex - 1]);
      }
    }
  });

  // Date navigation functions
  const navigateDate = (days) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDate = currentDate.toISOString().split('T')[0];
    setSelectedDate(newDate);
    
    // Update URL param
    const url = new URL(window.location);
    url.searchParams.set('date', newDate);
    window.history.replaceState({}, '', url);
  };

  // Fetch data function
  const fetchData = useCallback(async (date) => {
    try {
      setLoading(true);
      setError(null);
      
      const [machinesResponse, employeesResponse, assignmentsResponse] = await Promise.all([
        API.get('/planner/machines'),
        API.get('/planner/employees'),
        API.get(`/planner/assignments?date=${date}`)
      ]);

      setMachines(machinesResponse || []);
      setEmployees(employeesResponse || []);
      setAssignments(assignmentsResponse || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
      showNotification('Failed to load data', 'danger');
    } finally {
      setLoading(false);
    }
  }, []);

  // Show notification function
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  }, []);

  // Load data when date changes
  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, fetchData]);

  // Get current assignments for selected date
  const currentAssignments = useMemo(() => {
    return assignments.filter(a => a.assignment_date === selectedDate);
  }, [assignments, selectedDate]);

  // Tab configuration
  const tabs = [
    { id: 'planning', label: 'Planning', icon: ClipboardList },
    { id: 'attendance', label: 'Attendance', icon: UserCheck },
    { id: 'workers', label: 'Workers', icon: Users }
  ];

  // Mobile-optimized header component
  const MobileHeader = () => (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <TouchButton 
            variant="ghost" 
            size="sm"
            onClick={() => window.history.back()}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchButton>
          
          <h1 className="text-lg font-semibold">Workforce Planning</h1>
          
          <TouchButton 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <Settings className="w-5 h-5" />
          </TouchButton>
        </div>
        
        {/* Date Navigation for Planning View */}
        {currentView === 'planning' && (
          <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
            <TouchButton
              onClick={() => navigateDate(-1)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 min-w-[44px] min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
            </TouchButton>
            
            <div className="text-center flex-1">
              <h2 className="text-lg font-semibold">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              <p className="text-blue-200 text-sm">
                {isMobile ? 'Swipe to navigate • Long press for calendar' : 'Use arrows to navigate dates'}
              </p>
            </div>
            
            <TouchButton
              onClick={() => navigateDate(1)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 min-w-[44px] min-h-[44px]"
            >
              <ArrowRight className="w-4 h-4" />
            </TouchButton>
          </div>
        )}
      </div>
      
      {/* Tab Navigation */}
      <div className="px-4 pb-4">
        <TabNavigation
          activeTab={currentView}
          onTabChange={setCurrentView}
          tabs={tabs}
          variant="white"
        />
        {isMobile && (
          <p className="text-blue-200 text-xs text-center mt-2">
            Swipe left/right to switch tabs
          </p>
        )}
      </div>
    </div>
  );

  // Desktop header component
  const DesktopHeader = () => (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <span className="text-blue-600 font-medium">Planning Mode</span>
            <span>›</span>
            <span 
              className="cursor-pointer hover:text-blue-600" 
              onClick={() => window.location.href = `/labour-layout?date=${selectedDate}`}
            >
              View Layout
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Labor Management System</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <TouchButton variant="ghost" size="sm" onClick={() => {}}>
            <Download className="w-4 h-4" />
          </TouchButton>
          <TouchButton 
            variant="ghost" 
            size="sm" 
            onClick={() => fetchData(selectedDate)}
          >
            <RefreshCw className="w-4 h-4" />
          </TouchButton>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <TabNavigation
        activeTab={currentView}
        onTabChange={setCurrentView}
        tabs={tabs}
        variant="default"
      />
    </div>
  );

  // Simplified Planning View (placeholder for now)
  const PlanningView = () => (
    <div className={`flex-1 p-4 md:p-6`}>
      <div className={`${theme.card} rounded-xl shadow-sm border p-4 md:p-6`}>
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ClipboardList className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">Planning Module</h3>
          <p className="text-slate-500 mb-4">Planning functionality will be integrated here</p>
          <p className="text-sm text-slate-400">This will contain the main planning interface</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading workforce data...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50">
      {/* Header */}
      {isMobile || isTablet ? <MobileHeader /> : <DesktopHeader />}
      
      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        {currentView === 'planning' && <PlanningView />}
        {currentView === 'attendance' && (
          <AttendanceModule 
            onShowNotification={showNotification}
          />
        )}
        {currentView === 'workers' && (
          <WorkersModule 
            assignments={currentAssignments}
            onShowNotification={showNotification}
          />
        )}
      </div>

      {/* Notification */}  
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'danger' ? 'bg-red-500 text-white' :
          notification.type === 'info' ? 'bg-blue-500 text-white' :
          'bg-gray-500 text-white'
        } ${!shouldReduceAnimations ? 'animate-slide-in' : ''}`}>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 z-50 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <TouchButton
            onClick={() => setError(null)}
            variant="ghost"
            size="sm"
            className="mt-2 text-red-600 hover:text-red-800"
          >
            Dismiss
          </TouchButton>
        </div>
      )}
    </div>
  );
};

export default LaborPlannerContainer;