// users.js - User Management Component
// Save as: public/js/components/users.js

window.UsersPage = () => {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [formData, setFormData] = React.useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'operator'
  });
  const [error, setError] = React.useState('');

  // Current user for permission checks
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await window.API.get('/users');
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadUsers();
  }, []);

  const validateForm = () => {
    if (!formData.username || !formData.email) {
      setError('Username and email are required');
      return false;
    }

    if (!showEditModal && (!formData.password || formData.password.length < 6)) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email address');
      return false;
    }

    return true;
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    try {
      await window.API.post('/users', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      setShowAddModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      setError(error.message || 'Failed to add user');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    try {
      const updateData = {
        username: formData.username,
        email: formData.email,
        role: formData.role
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await window.API.put(`/users/${selectedUser.id}`, updateData);
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      setError(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser.id) {
      alert('You cannot delete your own account');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await window.API.delete(`/users/${userId}`);
        loadUsers();
      } catch (error) {
        alert('Failed to delete user: ' + error.message);
      }
    }
  };

  const handleToggleActive = async (user) => {
    if (user.id === currentUser.id) {
      alert('You cannot deactivate your own account');
      return;
    }

    try {
      await window.API.patch(`/users/${user.id}/toggle-active`);
      loadUsers();
    } catch (error) {
      alert('Failed to update user status: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'operator'
    });
    setError('');
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      admin: 'bg-purple-100 text-purple-800',
      supervisor: 'bg-blue-100 text-blue-800',
      operator: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800'
    };

    return React.createElement('span', {
      className: `px-2 py-1 rounded-full text-xs font-medium ${roleColors[role] || roleColors.viewer}`
    }, role.toUpperCase());
  };

  const getStatusBadge = (isActive) => {
    return React.createElement('span', {
      className: `px-2 py-1 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`
    }, isActive ? 'Active' : 'Inactive');
  };

  if (loading && users.length === 0) {
    return React.createElement('div', { className: 'p-6' }, 'Loading users...');
  }

  return React.createElement('div', { className: 'p-6' },
    // Header
    React.createElement('div', { className: 'mb-6 flex justify-between items-center' },
      React.createElement('h1', { className: 'text-2xl font-bold' }, 'User Management'),
      currentUser.role === 'admin' && React.createElement('button', {
        onClick: () => setShowAddModal(true),
        className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
      }, 'Add New User')
    ),

    // Stats Cards
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-6' },
      React.createElement('div', { className: 'bg-white p-4 rounded-lg shadow' },
        React.createElement('h3', { className: 'text-sm text-gray-500' }, 'Total Users'),
        React.createElement('p', { className: 'text-2xl font-bold' }, users.length)
      ),
      React.createElement('div', { className: 'bg-white p-4 rounded-lg shadow' },
        React.createElement('h3', { className: 'text-sm text-gray-500' }, 'Active Users'),
        React.createElement('p', { className: 'text-2xl font-bold text-green-600' }, 
          users.filter(u => u.is_active).length
        )
      ),
      React.createElement('div', { className: 'bg-white p-4 rounded-lg shadow' },
        React.createElement('h3', { className: 'text-sm text-gray-500' }, 'Administrators'),
        React.createElement('p', { className: 'text-2xl font-bold text-purple-600' }, 
          users.filter(u => u.role === 'admin').length
        )
      ),
      React.createElement('div', { className: 'bg-white p-4 rounded-lg shadow' },
        React.createElement('h3', { className: 'text-sm text-gray-500' }, 'Operators'),
        React.createElement('p', { className: 'text-2xl font-bold text-blue-600' }, 
          users.filter(u => u.role === 'operator').length
        )
      )
    ),

    // Users Table
    React.createElement('div', { className: 'bg-white rounded-lg shadow overflow-hidden' },
      React.createElement('table', { className: 'min-w-full' },
        React.createElement('thead', { className: 'bg-gray-50' },
          React.createElement('tr', {},
            ['Username', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(header =>
              React.createElement('th', {
                key: header,
                className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
              }, header)
            )
          )
        ),
        React.createElement('tbody', { className: 'bg-white divide-y divide-gray-200' },
          users.map(user =>
            React.createElement('tr', { key: user.id },
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' },
                React.createElement('div', { className: 'flex items-center' },
                  React.createElement('div', {
                    className: 'h-10 w-10 flex-shrink-0 bg-gray-300 rounded-full flex items-center justify-center'
                  },
                    React.createElement('span', { className: 'text-gray-700 font-medium' },
                      user.username.charAt(0).toUpperCase()
                    )
                  ),
                  React.createElement('div', { className: 'ml-4' },
                    React.createElement('div', { className: 'text-sm font-medium text-gray-900' },
                      user.username
                    ),
                    user.id === currentUser.id && React.createElement('span', {
                      className: 'text-xs text-gray-500'
                    }, '(You)')
                  )
                )
              ),
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500' },
                user.email
              ),
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' },
                getRoleBadge(user.role)
              ),
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' },
                getStatusBadge(user.is_active)
              ),
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500' },
                user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'
              ),
              React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap text-sm space-x-2' },
                // Edit button
                (currentUser.role === 'admin' || user.id === currentUser.id) &&
                React.createElement('button', {
                  onClick: () => {
                    setSelectedUser(user);
                    setFormData({
                      username: user.username,
                      email: user.email,
                      password: '',
                      confirmPassword: '',
                      role: user.role
                    });
                    setShowEditModal(true);
                  },
                  className: 'text-blue-600 hover:text-blue-900'
                }, 'Edit'),

                // Toggle Active button
                currentUser.role === 'admin' && user.id !== currentUser.id &&
                React.createElement('button', {
                  onClick: () => handleToggleActive(user),
                  className: user.is_active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                }, user.is_active ? 'Deactivate' : 'Activate'),

                // Delete button
                currentUser.role === 'admin' && user.id !== currentUser.id &&
                React.createElement('button', {
                  onClick: () => handleDeleteUser(user.id),
                  className: 'text-red-600 hover:text-red-900'
                }, 'Delete')
              )
            )
          )
        )
      )
    ),

    // Add User Modal
    showAddModal && React.createElement('div', {
      className: 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50',
      onClick: () => {
        setShowAddModal(false);
        resetForm();
      }
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg p-6 w-full max-w-md',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('h2', { className: 'text-lg font-bold mb-4' }, 'Add New User'),
        
        error && React.createElement('div', {
          className: 'mb-4 p-3 bg-red-100 text-red-700 rounded'
        }, error),

        React.createElement('form', { onSubmit: handleAddUser, className: 'space-y-4' },
          React.createElement('input', {
            type: 'text',
            placeholder: 'Username',
            value: formData.username,
            onChange: (e) => setFormData({...formData, username: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true
          }),
          React.createElement('input', {
            type: 'email',
            placeholder: 'Email',
            value: formData.email,
            onChange: (e) => setFormData({...formData, email: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true
          }),
          React.createElement('input', {
            type: 'password',
            placeholder: 'Password (min 6 characters)',
            value: formData.password,
            onChange: (e) => setFormData({...formData, password: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true,
            minLength: 6
          }),
          React.createElement('input', {
            type: 'password',
            placeholder: 'Confirm Password',
            value: formData.confirmPassword,
            onChange: (e) => setFormData({...formData, confirmPassword: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true
          }),
          React.createElement('select', {
            value: formData.role,
            onChange: (e) => setFormData({...formData, role: e.target.value}),
            className: 'w-full px-3 py-2 border rounded'
          },
            React.createElement('option', { value: 'operator' }, 'Operator'),
            React.createElement('option', { value: 'supervisor' }, 'Supervisor'),
            React.createElement('option', { value: 'admin' }, 'Administrator'),
            React.createElement('option', { value: 'viewer' }, 'Viewer')
          ),
          React.createElement('div', { className: 'flex justify-end space-x-2' },
            React.createElement('button', {
              type: 'button',
              onClick: () => {
                setShowAddModal(false);
                resetForm();
              },
              className: 'px-4 py-2 border rounded hover:bg-gray-100'
            }, 'Cancel'),
            React.createElement('button', {
              type: 'submit',
              className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
            }, 'Add User')
          )
        )
      )
    ),

    // Edit User Modal
    showEditModal && selectedUser && React.createElement('div', {
      className: 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50',
      onClick: () => {
        setShowEditModal(false);
        setSelectedUser(null);
        resetForm();
      }
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg p-6 w-full max-w-md',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('h2', { className: 'text-lg font-bold mb-4' }, 'Edit User'),
        
        error && React.createElement('div', {
          className: 'mb-4 p-3 bg-red-100 text-red-700 rounded'
        }, error),

        React.createElement('form', { onSubmit: handleEditUser, className: 'space-y-4' },
          React.createElement('input', {
            type: 'text',
            placeholder: 'Username',
            value: formData.username,
            onChange: (e) => setFormData({...formData, username: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true
          }),
          React.createElement('input', {
            type: 'email',
            placeholder: 'Email',
            value: formData.email,
            onChange: (e) => setFormData({...formData, email: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: true
          }),
          React.createElement('input', {
            type: 'password',
            placeholder: 'New Password (leave blank to keep current)',
            value: formData.password,
            onChange: (e) => setFormData({...formData, password: e.target.value}),
            className: 'w-full px-3 py-2 border rounded'
          }),
          formData.password && React.createElement('input', {
            type: 'password',
            placeholder: 'Confirm New Password',
            value: formData.confirmPassword,
            onChange: (e) => setFormData({...formData, confirmPassword: e.target.value}),
            className: 'w-full px-3 py-2 border rounded',
            required: !!formData.password
          }),
          // Only admin can change roles, and not their own
          currentUser.role === 'admin' && selectedUser.id !== currentUser.id ?
            React.createElement('select', {
              value: formData.role,
              onChange: (e) => setFormData({...formData, role: e.target.value}),
              className: 'w-full px-3 py-2 border rounded'
            },
              React.createElement('option', { value: 'operator' }, 'Operator'),
              React.createElement('option', { value: 'supervisor' }, 'Supervisor'),
              React.createElement('option', { value: 'admin' }, 'Administrator'),
              React.createElement('option', { value: 'viewer' }, 'Viewer')
            ) :
            React.createElement('div', {
              className: 'px-3 py-2 bg-gray-100 rounded'
            }, `Role: ${formData.role.toUpperCase()}`),
          
          React.createElement('div', { className: 'flex justify-end space-x-2' },
            React.createElement('button', {
              type: 'button',
              onClick: () => {
                setShowEditModal(false);
                setSelectedUser(null);
                resetForm();
              },
              className: 'px-4 py-2 border rounded hover:bg-gray-100'
            }, 'Cancel'),
            React.createElement('button', {
              type: 'submit',
              className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
            }, 'Update User')
          )
        )
      )
    )
  );
};
