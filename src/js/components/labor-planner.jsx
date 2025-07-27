import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Users, Search, Plus, CheckCircle, X, ClipboardList, UserCheck, Settings, Edit2, Save, Trash2, Upload, Download } from 'lucide-react';
import API from '../core/api';

// Reusable UI Components defined locally for simplicity
const Card = ({ children, className = "" }) => <div className={`bg-white rounded-xl shadow-sm p-6 sm:p-8 ${className}`}>{children}</div>;
const Button = ({ children, onClick, className = "", variant = "primary", disabled = false, ...props }) => {
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700",
        secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
        danger: "bg-red-600 text-white hover:bg-red-700",
        success: "bg-green-600 text-white hover:bg-green-700",
        ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    };
    return <button onClick={onClick} className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`} disabled={disabled} {...props}>{children}</button>;
};
const Modal = ({ children, onClose, title }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
             <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
                {children}
            </div>
        </div>
    </div>
);


// Main Component
export function LaborManagementSystem() {
    const [currentView, setCurrentView] = useState('planning');
    const [machines, setMachines] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    // Planning state
    const [selectedMachine, setSelectedMachine] = useState('');
    const [selectedShift, setSelectedShift] = useState('day');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [planningSearch, setPlanningSearch] = useState('');

    // Attendance state
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

    // Worker management state
    const [workerSearch, setWorkerSearch] = useState('');
    const [editingWorker, setEditingWorker] = useState(null);

    const fetchData = useCallback(async (date) => {
        setLoading(true);
        try {
            const [machinesData, employeesData, assignmentsData] = await Promise.all([
                API.get('/machines'),
                API.get('/users'),
                API.get(`/planner/assignments?date=${date}`)
            ]);
            setMachines(machinesData);
            setEmployees(employeesData.filter(u => u.role !== 'admin'));
            setAssignments(assignmentsData);
        } catch (error) {
            showNotification('Failed to load initial data: ' + error.message, 'danger');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const dateToFetch = currentView === 'attendance' ? attendanceDate : selectedDate;
        fetchData(dateToFetch);
    }, [selectedDate, attendanceDate, currentView, fetchData]);
    
    // Memos for filtering
    const currentAssignments = useMemo(() => assignments.filter(a => a.machine_id == selectedMachine && a.shift === selectedShift && a.assignment_date === selectedDate), [assignments, selectedMachine, selectedShift, selectedDate]);
    const attendanceAssignments = useMemo(() => assignments.filter(a => a.assignment_date === attendanceDate), [assignments, attendanceDate]);
    const filteredEmployees = useMemo(() => employees.filter(e => !workerSearch || e.username.toLowerCase().includes(workerSearch.toLowerCase()) || (e.employee_code && e.employee_code.toLowerCase().includes(workerSearch.toLowerCase()))), [employees, workerSearch]);

    const showNotification = useCallback((message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
    }, []);

    // API Functions
    const assignEmployee = async (employeeId) => {
        if (currentAssignments.some(a => a.employee_id === employeeId)) return showNotification('Employee already assigned', 'danger');
        if (!selectedMachine) return showNotification('Please select a machine first', 'danger');
        if (!selectedDate) return showNotification('Please select a date first', 'danger');
        
        try {
            console.log('Assigning employee:', { employee_id: employeeId, machine_id: selectedMachine, shift: selectedShift, assignment_date: selectedDate });
            const newAssignment = await API.post('/planner/assignments', { employee_id: employeeId, machine_id: selectedMachine, shift: selectedShift, assignment_date: selectedDate });
            fetchData(selectedDate); // Refetch to get all details
            showNotification('Employee assigned successfully');
        } catch (error) { 
            console.error('Assignment error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to assign employee';
            showNotification(`Assignment failed: ${errorMessage}`, 'danger'); 
        }
    };

    const removeAssignment = async (id) => {
        try {
            await API.delete(`/planner/assignments/${id}`);
            fetchData(selectedDate);
            showNotification('Assignment removed');
        } catch (error) { showNotification('Failed to remove assignment', 'danger'); }
    };

    const updateAttendanceStatus = async (id, status) => {
        try {
            await API.patch(`/planner/assignments/${id}`, { status });
            fetchData(attendanceDate);
            showNotification(`Attendance updated to ${status}`);
        } catch (error) { showNotification('Failed to update status', 'danger'); }
    };
    
    const saveWorkerEdit = async () => {
        try {
            const { id, ...data } = editingWorker;
            await API.put(`/users/${id}`, data);
            fetchData(selectedDate);
            setEditingWorker(null);
            showNotification('Worker updated');
        } catch (error) { showNotification('Failed to update worker', 'danger'); }
    };

    if (loading) return <div className="p-6 text-center text-lg">Loading Labor Planner...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            {/* ... Navigation and Main View Logic ... */}
            
            {currentView === 'planning' && (
                <Card>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><ClipboardList className="w-8 h-8 text-blue-500" />Labor Planning</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <select value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)} className="w-full p-3 border rounded-lg">
                            <option value="">Select Machine...</option>
                            {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className="w-full p-3 border rounded-lg">
                            <option value="day">Day Shift</option>
                            <option value="night">Night Shift</option>
                        </select>
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-3 border rounded-lg"/>
                    </div>
                    {selectedMachine && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                               <h3 className="text-xl font-semibold">Assigned Workers</h3>
                               <Button onClick={() => setShowEmployeeModal(true)}><Plus size={16}/>Add Worker</Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {currentAssignments.map(a => (
                                    <div key={a.id} className="p-3 bg-gray-100 rounded-lg flex justify-between items-center">
                                        <span>{a.username} ({a.employee_code})</span>
                                        <button onClick={() => removeAssignment(a.id)}><X size={16} className="text-red-500"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {currentView === 'attendance' && (
                <Card>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><UserCheck className="w-8 h-8 text-green-500" />Attendance Confirmation</h2>
                    <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-full md:w-1/3 p-3 border rounded-lg mb-4"/>
                    <div className="space-y-3">
                        {attendanceAssignments.map(a => (
                            <div key={a.id} className="p-4 bg-gray-50 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <p className="font-bold">{a.username}</p>
                                    <p className="text-sm text-gray-600">{a.machine_name} | {a.shift} shift</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={() => updateAttendanceStatus(a.id, 'present')} variant={a.status === 'present' ? 'success' : 'secondary'}>Present</Button>
                                    <Button onClick={() => updateAttendanceStatus(a.id, 'absent')} variant={a.status === 'absent' ? 'danger' : 'secondary'}>Absent</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {currentView === 'workers' && (
                <Card>
                     <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Users className="w-8 h-8 text-purple-500" />Worker Management</h2>
                     <div className="space-y-2">
                        {employees.map(e => (
                             <div key={e.id} className="p-3 border rounded-lg flex justify-between items-center">
                                 <p>{e.username} ({e.employee_code})</p>
                                 <button onClick={() => setEditingWorker(e)}><Edit2 size={16}/></button>
                             </div>
                        ))}
                     </div>
                </Card>
            )}
            
            {showEmployeeModal && (
                <Modal title="Assign Employee" onClose={() => setShowEmployeeModal(false)}>
                     <input type="text" placeholder="Search..." onChange={e => setPlanningSearch(e.target.value)} className="w-full p-3 border rounded-lg mb-4"/>
                     <div className="space-y-2">
                        {filteredEmployees.map(e => {
                            const isAssigned = currentAssignments.some(a => a.employee_id === e.id);
                            return (
                                <div key={e.id} className={`p-3 rounded-lg flex justify-between items-center ${isAssigned ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
                                    <p>{e.username} ({e.employee_code})</p>
                                    <Button onClick={() => assignEmployee(e.id)} disabled={isAssigned}>Assign</Button>
                                </div>
                            )
                        })}
                     </div>
                </Modal>
            )}
            
            {editingWorker && (
                 <Modal title="Edit Worker" onClose={() => setEditingWorker(null)}>
                     <div className="space-y-4">
                        <input value={editingWorker.employee_code} onChange={e => setEditingWorker({...editingWorker, employee_code: e.target.value})} placeholder="Employee Code" className="w-full p-3 border rounded-lg"/>
                        {/* Add other fields here */}
                        <Button onClick={saveWorkerEdit}>Save</Button>
                     </div>
                 </Modal>
            )}

            {notification.show && (
                <div className={`fixed bottom-6 right-6 z-50 text-white p-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {notification.message}
                </div>
            )}
        </div>
    );
}
