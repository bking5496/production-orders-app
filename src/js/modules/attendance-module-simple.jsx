import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, 
  Calendar, 
  CheckCircle, 
  X, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import API from '../core/api';

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

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">Loading attendance data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">Attendance Tracking</h2>
              <p className="text-slate-600 text-sm">Monitor daily attendance and presence</p>
            </div>
          </div>
          
          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ‹
            </button>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input 
                type="date" 
                value={attendanceDate} 
                onChange={e => setAttendanceDate(e.target.value)} 
                className="bg-transparent border-none focus:outline-none font-medium text-sm md:text-base"
              />
            </div>
            
            <button
              onClick={() => navigateDate(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ›
            </button>
            
            <button
              onClick={() => fetchAttendanceData(attendanceDate)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-50 border-emerald-200 text-emerald-700 rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium opacity-90">Present</p>
                <p className="text-2xl font-bold">{attendanceStats.present}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 border-red-200 text-red-700 rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium opacity-90">Absent</p>
                <p className="text-2xl font-bold">{attendanceStats.absent}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 border-amber-200 text-amber-700 rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium opacity-90">Pending</p>
                <p className="text-2xl font-bold">{attendanceStats.pending}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance List */}
        {assignments.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 mb-3">
              Team Attendance ({assignments.length} employees)
            </h3>
            {assignments.map(assignment => (
              <div key={assignment.id} className="bg-white rounded-xl border-2 p-4 hover:shadow-lg transition-all duration-300">
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
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => updateAttendanceStatus(assignment.id, 'present')}
                      className={`min-w-[44px] min-h-[44px] p-2 rounded-lg border transition-all ${
                        assignment.status === 'present'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600'
                      }`}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => updateAttendanceStatus(assignment.id, 'absent')}
                      className={`min-w-[44px] min-h-[44px] p-2 rounded-lg border transition-all ${
                        assignment.status === 'absent'
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                      }`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
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