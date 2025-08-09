import React, { useState, useEffect } from 'react';
import API from '../core/api';
import { useAuth } from '../core/auth';
import { Modal } from './ui-components.jsx';
import { useAutoConnect } from '../core/websocket-hooks.js';
import { WebSocketStatusCompact } from './websocket-status.jsx';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '', role: 'operator'
  });
  const [error, setError] = useState('');

  // WebSocket integration
  useAutoConnect();
  const { user: currentUser } = useAuth();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await API.get('/users');
      // Handle both direct array response and wrapped response
      const userData = response?.data || response;
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]); // Ensure users is always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setFormData({ username: '', email: '', password: '', confirmPassword: '', role: 'operator' });
    setError('');
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    try {
      await API.post('/users', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      setShowAddModal(false);
      resetForm();
      loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to add user');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await API.put(`/users/${selectedUser.id}`, {
        email: formData.email,
        role: formData.role
      });
      setShowEditModal(false);
      resetForm();
      loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser.id) {
      return alert('You cannot delete your own account.');
    }
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await API.delete(`/users/${userId}`);
        loadUsers();
      } catch (error) {
        alert('Failed to delete user: ' + error.message);
      }
    }
  };

  // Function to capitalize first and last words
  const formatDisplayName = (name) => {
    if (!name) return '';
    const words = name.split(' ').filter(word => word.length > 0);
    if (words.length === 0) return name;
    
    // Capitalize first and last word, keep middle words as they are
    const formattedWords = words.map((word, index) => {
      if (index === 0 || index === words.length - 1) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word; // Keep middle words unchanged
    });
    
    return formattedWords.join(' ');
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      admin: 'bg-purple-100 text-purple-800', supervisor: 'bg-blue-100 text-blue-800',
      operator: 'bg-green-100 text-green-800', viewer: 'bg-gray-100 text-gray-800',
      packer: 'bg-orange-100 text-orange-800'
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-800'}`}>{role.toUpperCase()}</span>;
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">User Management</h1>
          <WebSocketStatusCompact />
        </div>
        {currentUser?.role === 'admin' && (
          <button onClick={() => { resetForm(); setShowAddModal(true); }} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Add New User
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {['User', 'Employee Code', 'Email', 'Role', 'Status', 'Actions'].map(h => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">{formatDisplayName(user.username)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 font-mono">
                    {user.employee_code || user.id.toString().padStart(4, '0')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.is_active ? 'Active' : 'Inactive'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  {currentUser?.role === 'admin' && (
                    <>
                      <button onClick={() => { setSelectedUser(user); setFormData(user); setShowEditModal(true); }} className="text-blue-600 hover:text-blue-800">Edit</button>
                      <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <Modal title="Add New User" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddUser} className="space-y-4">
            {error && <div className="p-2 bg-red-100 text-red-700 rounded">{error}</div>}
            <input type="text" placeholder="Username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full px-3 py-2 border rounded" required />
            <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded" required />
            <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded" required />
            <input type="password" placeholder="Confirm Password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="w-full px-3 py-2 border rounded" required />
            <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border rounded">
              <option value="operator">Operator</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrator</option>
              <option value="viewer">Viewer</option>
            </select>
            <div className="flex justify-end space-x-2"><button type="button" onClick={() => setShowAddModal(false)}>Cancel</button><button type="submit">Add User</button></div>
          </form>
        </Modal>
      )}

      {showEditModal && selectedUser && (
        <Modal title="Edit User" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEditUser} className="space-y-4">
             {error && <div className="p-2 bg-red-100 text-red-700 rounded">{error}</div>}
            <div>
                <label>Username</label>
                <input type="text" value={formData.username} className="w-full px-3 py-2 border rounded bg-gray-100" disabled />
            </div>
            <div>
                <label>Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded" required />
            </div>
            <div>
                <label>Role</label>
                <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border rounded">
                  <option value="operator">Operator</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrator</option>
                  <option value="viewer">Viewer</option>
                </select>
            </div>
            <div className="flex justify-end space-x-2"><button type="button" onClick={() => setShowEditModal(false)}>Cancel</button><button type="submit">Update User</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
