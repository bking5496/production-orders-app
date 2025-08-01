import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  UserCheck, 
  Calendar, 
  CheckCircle, 
  X, 
  AlertCircle,
  RefreshCw,
  Users
} from 'lucide-react';
import API from '../core/api';
import { 
  TouchButton, 
  TouchDropdown,
  ResponsiveTable,
  useDeviceDetection,
  useTouchGestures,
  usePerformanceOptimization
} from '../components/mobile-responsive-utils.jsx';
import { useHighContrastTheme } from '../components/mobile-theme-system.jsx';

const getCurrentSASTDateString = () => {
  const now = new Date();
  now.setHours(now.getHours() + 2); // Convert to SAST (UTC+2)
  return now.toISOString().split('T')[0];
};

const AttendanceModule = ({ onShowNotification }) => {
  const [attendanceDate, setAttendanceDate] = useState(getCurrentSASTDateString());
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mobile detection and performance optimization
  const { isMobile, isTablet } = useDeviceDetection();
  const { shouldReduceAnimations } = usePerformanceOptimization();
  const { theme } = useHighContrastTheme();

  // Touch gesture support for date navigation
  const containerRef = useRef(null);
  useTouchGestures(containerRef.current, {
    onSwipeLeft: () => navigateDate(1),   // Next day
    onSwipeRight: () => navigateDate(-1), // Previous day
    onLongPress: () => {
      // Quick date picker - show native date input
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) dateInput.focus();
    }
  });

  // Date navigation functions
  const navigateDate = (days) => {
    const currentDate = new Date(attendanceDate);
    currentDate.setDate(currentDate.getDate() + days);
    setAttendanceDate(currentDate.toISOString().split('T')[0]);
  };

  // Fetch attendance data
  const fetchAttendanceData = async (date) => {
    try {
      setLoading(true);
      setError(null);
      const response = await API.get(`/planner/assignments?date=${date}`);
      setAssignments(response || []);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setError('Failed to load attendance data');
      onShowNotification?.('Failed to load attendance data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Update attendance status
  const updateAttendanceStatus = async (id, status) => {
    try {
      await API.patch(`/planner/assignments/${id}`, { status });
      await fetchAttendanceData(attendanceDate);
      onShowNotification?.(`Attendance updated to ${status}`, 'success');
    } catch (error) {
      console.error('Error updating attendance:', error);
      onShowNotification?.('Failed to update attendance status', 'danger');
    }
  };

  // Calculate attendance statistics
  const attendanceStats = useMemo(() => {
    const present = assignments.filter(a => a.status === 'present').length;
    const absent = assignments.filter(a => a.status === 'absent').length;
    const pending = assignments.filter(a => a.status === 'planned' || !a.status).length;
    
    return { present, absent, pending, total: assignments.length };
  }, [assignments]);

  // Load data when date changes
  useEffect(() => {
    fetchAttendanceData(attendanceDate);
  }, [attendanceDate]);

  // Mobile-optimized attendance card
  const AttendanceCard = ({ assignment }) => (
    <div className={`${theme.card} rounded-xl border p-4 ${!shouldReduceAnimations ? 'hover:shadow-lg transition-all duration-300' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        {/* Employee Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white font-medium text-sm">
              {assignment.employee_code?.slice(0, 2) || assignment.username?.slice(0, 2).toUpperCase()}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-base truncate">
              {assignment.fullName || assignment.username}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
              <span className="text-slate-600">{assignment.employee_code}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 truncate">{assignment.machine_name}</span>
              {assignment.job_role && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="font-medium text-blue-600">{assignment.job_role}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                assignment.shift === 'day' 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {assignment.shift} shift
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                assignment.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                assignment.status === 'absent' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {assignment.status === 'present' ? 'Present' :
                 assignment.status === 'absent' ? 'Absent' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Touch-optimized action buttons */}
        <div className="flex gap-2 shrink-0">
          <TouchButton
            onClick={() => updateAttendanceStatus(assignment.id, 'present')}
            variant={assignment.status === 'present' ? 'success' : 'ghost'}
            size="sm"
            className="min-w-[44px] min-h-[44px]"
          >
            <CheckCircle className="w-5 h-5" />
          </TouchButton>
          <TouchButton
            onClick={() => updateAttendanceStatus(assignment.id, 'absent')}
            variant={assignment.status === 'absent' ? 'danger' : 'ghost'}
            size="sm"
            className="min-w-[44px] min-h-[44px]"
          >
            <X className="w-5 h-5" />
          </TouchButton>
        </div>
      </div>
    </div>
  );

  // Statistics card component
  const StatCard = ({ icon: Icon, title, count, variant }) => {
    const variants = {
      success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      danger: 'bg-red-50 border-red-200 text-red-700',
      warning: 'bg-amber-50 border-amber-200 text-amber-700'
    };

    return (
      <div className={`${variants[variant]} rounded-xl p-4 border`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            variant === 'success' ? 'bg-emerald-100' :
            variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            <Icon className={`w-5 h-5 ${
              variant === 'success' ? 'text-emerald-600' :
              variant === 'danger' ? 'text-red-600' : 'text-amber-600'
            }`} />
          </div>
          <div>
            <p className="text-sm font-medium opacity-90">{title}</p>
            <p className="text-2xl font-bold">{count}</p>
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
        {/* Header with touch-optimized date navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">Attendance Tracking</h2>
              <p className="text-slate-600 text-sm">Monitor daily attendance and presence</p>
              {isMobile && (
                <p className="text-slate-400 text-xs mt-1">Swipe left/right to navigate dates</p>
              )}
            </div>
          </div>
          
          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <TouchButton
              onClick={() => navigateDate(-1)}
              variant="ghost"
              size="sm"
              className="min-w-[44px] min-h-[44px]"
            >
              ‹
            </TouchButton>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input 
                type="date" 
                value={attendanceDate} 
                onChange={e => setAttendanceDate(e.target.value)} 
                className="bg-transparent border-none focus:outline-none font-medium text-sm md:text-base"
              />
            </div>
            
            <TouchButton
              onClick={() => navigateDate(1)}
              variant="ghost"
              size="sm"
              className="min-w-[44px] min-h-[44px]"
            >
              ›
            </TouchButton>
            
            <TouchButton
              onClick={() => fetchAttendanceData(attendanceDate)}
              variant="ghost"
              size="sm"
              className="min-w-[44px] min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
            </TouchButton>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={CheckCircle}
            title="Present"
            count={attendanceStats.present}
            variant="success"
          />
          <StatCard
            icon={X}
            title="Absent"
            count={attendanceStats.absent}
            variant="danger"
          />
          <StatCard
            icon={AlertCircle}
            title="Pending"
            count={attendanceStats.pending}
            variant="warning"
          />
        </div>

        {/* Attendance List */}
        {assignments.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 mb-3">
              Team Attendance ({assignments.length} employees)
            </h3>
            {assignments.map(assignment => (
              <AttendanceCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserCheck className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">No assignments found</h3>
            <p className="text-slate-500 mb-4">No scheduled assignments for this date</p>
            <p className="text-sm text-slate-400">Check the planning board to create assignments first</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceModule;