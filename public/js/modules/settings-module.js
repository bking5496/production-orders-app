// settings-module.js - Settings and Configuration Module
// Save as: public/js/modules/settings-module.js

window.loadModule('settings-module', ['api', 'auth'], () => {
  
  // Settings Page Component
  window.SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('general');
    const { user, hasRole } = useAuth();

    const tabs = [
      { id: 'general', label: 'General', icon: ICONS.Settings },
      { id: 'profile', label: 'Profile', icon: ICONS.User },
      { id: 'notifications', label: 'Notifications', icon: ICONS.Bell },
      hasRole(['admin']) && { id: 'system', label: 'System', icon: ICONS.Wrench },
      hasRole(['admin', 'supervisor']) && { id: 'environments', label: 'Environments', icon: ICONS.Package }
    ].filter(Boolean);

    return React.createElement('div', { className: 'space-y-6' },
      React.createElement(PageHeader, {
        title: 'Settings',
        subtitle: 'Manage your preferences and system configuration'
      }),

      React.createElement(Tabs, {
        tabs,
        activeTab,
        onChange: setActiveTab
      }),

      React.createElement('div', { className: 'mt-6' },
        activeTab === 'general' && React.createElement(GeneralSettings),
        activeTab === 'profile' && React.createElement(ProfileSettings),
        activeTab === 'notifications' && React.createElement(NotificationSettings),
        activeTab === 'system' && React.createElement(SystemSettings),
        activeTab === 'environments' && React.createElement(EnvironmentSettings)
      )
    );
  };

  // General Settings Component
  const GeneralSettings = () => {
    const [settings, setSettings] = useState({
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      pageSize: 25
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      loadSettings();
    }, []);

    const loadSettings = async () => {
      try {
        const data = await API.get('/settings/general');
        setSettings(data);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    const saveSettings = async () => {
      setSaving(true);
      try {
        await API.put('/settings/general', settings);
        Utils.storage.set('app_settings', settings);
      } catch (error) {
        console.error('Failed to save settings:', error);
      } finally {
        setSaving(false);
      }
    };

    return React.createElement(ContentCard, {
      title: 'General Settings'
    },
      React.createElement('div', { className: 'space-y-6' },
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
          React.createElement(Select, {
            label: 'Theme',
            value: settings.theme,
            onChange: (e) => setSettings(prev => ({ ...prev, theme: e.target.value })),
            options: [
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'Auto (System)' }
            ]
          }),

          React.createElement(Select, {
            label: 'Language',
            value: settings.language,
            onChange: (e) => setSettings(prev => ({ ...prev, language: e.target.value })),
            options: [
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' }
            ]
          }),

          React.createElement(Select, {
            label: 'Timezone',
            value: settings.timezone,
            onChange: (e) => setSettings(prev => ({ ...prev, timezone: e.target.value })),
            options: [
              { value: 'UTC', label: 'UTC' },
              { value: 'America/New_York', label: 'Eastern Time' },
              { value: 'America/Chicago', label: 'Central Time' },
              { value: 'America/Denver', label: 'Mountain Time' },
              { value: 'America/Los_Angeles', label: 'Pacific Time' }
            ]
          }),

          React.createElement(Select, {
            label: 'Date Format',
            value: settings.dateFormat,
            onChange: (e) => setSettings(prev => ({ ...prev, dateFormat: e.target.value })),
            options: [
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
            ]
          }),

          React.createElement(Select, {
            label: 'Items Per Page',
            value: settings.pageSize,
            onChange: (e) => setSettings(prev => ({ ...prev, pageSize: parseInt(e.target.value) })),
            options: [
              { value: 10, label: '10' },
              { value: 25, label: '25' },
              { value: 50, label: '50' },
              { value: 100, label: '100' }
            ]
          })
        ),

        React.createElement('div', { className: 'flex justify-end' },
          React.createElement(Button, {
            onClick: saveSettings,
            loading: saving
          }, 'Save Changes')
        )
      )
    );
  };

  // Profile Settings Component
  const ProfileSettings = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState({
      username: '',
      email: '',
      fullName: '',
      phone: ''
    });
    const [passwordData, setPasswordData] = useState({
      current: '',
      new: '',
      confirm: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      if (user) {
        setProfile({
          username: user.username,
          email: user.email,
          fullName: user.fullName || '',
          phone: user.phone || ''
        });
      }
    }, [user]);

    const updateProfile = async () => {
      setSaving(true);
      try {
        await API.put('/settings/profile', profile);
      } catch (error) {
        console.error('Failed to update profile:', error);
      } finally {
        setSaving(false);
      }
    };

    const changePassword = async () => {
      if (passwordData.new !== passwordData.confirm) {
        alert('Passwords do not match');
        return;
      }

      setSaving(true);
      try {
        await API.post('/settings/change-password', {
          currentPassword: passwordData.current,
          newPassword: passwordData.new
        });
        setPasswordData({ current: '', new: '', confirm: '' });
        alert('Password changed successfully');
      } catch (error) {
        console.error('Failed to change password:', error);
        alert('Failed to change password');
      } finally {
        setSaving(false);
      }
    };

    return React.createElement('div', { className: 'space-y-6' },
      // Profile Information
      React.createElement(ContentCard, {
        title: 'Profile Information'
      },
        React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
            React.createElement(Input, {
              label: 'Username',
              value: profile.username,
              disabled: true
            }),
            React.createElement(Input, {
              label: 'Email',
              type: 'email',
              value: profile.email,
              onChange: (e) => setProfile(prev => ({ ...prev, email: e.target.value }))
            }),
            React.createElement(Input, {
              label: 'Full Name',
              value: profile.fullName,
              onChange: (e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))
            }),
            React.createElement(Input, {
              label: 'Phone',
              type: 'tel',
              value: profile.phone,
              onChange: (e) => setProfile(prev => ({ ...prev, phone: e.target.value }))
            })
          ),
          React.createElement('div', { className: 'flex justify-end' },
            React.createElement(Button, {
              onClick: updateProfile,
              loading: saving
            }, 'Update Profile')
          )
        )
      ),

      // Change Password
      React.createElement(ContentCard, {
        title: 'Change Password'
      },
        React.createElement('div', { className: 'space-y-4' },
          React.createElement(Input, {
            label: 'Current Password',
            type: 'password',
            value: passwordData.current,
            onChange: (e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))
          }),
          React.createElement(Input, {
            label: 'New Password',
            type: 'password',
            value: passwordData.new,
            onChange: (e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))
          }),
          React.createElement(Input, {
            label: 'Confirm New Password',
            type: 'password',
            value: passwordData.confirm,
            onChange: (e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))
          }),
          React.createElement('div', { className: 'flex justify-end' },
            React.createElement(Button, {
              onClick: changePassword,
              loading: saving,
              disabled: !passwordData.current || !passwordData.new || !passwordData.confirm
            }, 'Change Password')
          )
        )
      )
    );
  };

  // Notification Settings Component
  const NotificationSettings = () => {
    const [notifications, setNotifications] = useState({
      email: {
        orderCreated: true,
        orderCompleted: true,
        machineDown: true,
        reportReady: true
      },
      inApp: {
        orderCreated: true,
        orderCompleted: true,
        machineDown: true,
        reportReady: true
      }
    });
    const [saving, setSaving] = useState(false);

    const saveNotifications = async () => {
      setSaving(true);
      try {
        await API.put('/settings/notifications', notifications);
      } catch (error) {
        console.error('Failed to save notification settings:', error);
      } finally {
        setSaving(false);
      }
    };

    const notificationTypes = [
      { key: 'orderCreated', label: 'Order Created' },
      { key: 'orderCompleted', label: 'Order Completed' },
      { key: 'machineDown', label: 'Machine Down' },
      { key: 'reportReady', label: 'Report Ready' }
    ];

    return React.createElement(ContentCard, {
      title: 'Notification Preferences'
    },
      React.createElement('div', { className: 'space-y-6' },
        React.createElement('div', { className: 'space-y-4' },
          React.createElement('h4', { className: 'font-medium' }, 'Email Notifications'),
          notificationTypes.map(type =>
            React.createElement('label', {
              key: type.key,
              className: 'flex items-center justify-between'
            },
              React.createElement('span', { className: 'text-sm' }, type.label),
              React.createElement('input', {
                type: 'checkbox',
                checked: notifications.email[type.key],
                onChange: (e) => setNotifications(prev => ({
                  ...prev,
                  email: { ...prev.email, [type.key]: e.target.checked }
                })),
                className: 'rounded border-gray-300 text-blue-600 focus:ring-blue-500'
              })
            )
          )
        ),

        React.createElement('div', { className: 'space-y-4' },
          React.createElement('h4', { className: 'font-medium' }, 'In-App Notifications'),
          notificationTypes.map(type =>
            React.createElement('label', {
              key: type.key,
              className: 'flex items-center justify-between'
            },
              React.createElement('span', { className: 'text-sm' }, type.label),
              React.createElement('input', {
                type: 'checkbox',
                checked: notifications.inApp[type.key],
                onChange: (e) => setNotifications(prev => ({
                  ...prev,
                  inApp: { ...prev.inApp, [type.key]: e.target.checked }
                })),
                className: 'rounded border-gray-300 text-blue-600 focus:ring-blue-500'
              })
            )
          )
        ),

        React.createElement('div', { className: 'flex justify-end' },
          React.createElement(Button, {
            onClick: saveNotifications,
            loading: saving
          }, 'Save Preferences')
        )
      )
    );
  };

  // System Settings Component (Admin only)
  const SystemSettings = () => {
    const [config, setConfig] = useState({
      maintenanceMode: false,
      autoBackup: true,
      backupInterval: 'daily',
      logLevel: 'info',
      sessionTimeout: 30
    });
    const [saving, setSaving] = useState(false);

    return React.createElement(ContentCard, {
      title: 'System Configuration',
      subtitle: 'Advanced system settings - changes affect all users'
    },
      React.createElement('div', { className: 'space-y-6' },
        React.createElement(Alert, {
          type: 'warning',
          title: 'Caution'
        }, 'Changes to system settings can affect all users. Please proceed carefully.'),

        React.createElement('div', { className: 'space-y-4' },
          React.createElement('label', { className: 'flex items-center justify-between' },
            React.createElement('div', {},
              React.createElement('span', { className: 'font-medium' }, 'Maintenance Mode'),
              React.createElement('p', { className: 'text-sm text-gray-500' }, 
                'Prevents non-admin users from accessing the system')
            ),
            React.createElement('input', {
              type: 'checkbox',
              checked: config.maintenanceMode,
              onChange: (e) => setConfig(prev => ({ ...prev, maintenanceMode: e.target.checked })),
              className: 'rounded border-gray-300 text-blue-600 focus:ring-blue-500'
            })
          ),

          React.createElement('label', { className: 'flex items-center justify-between' },
            React.createElement('div', {},
              React.createElement('span', { className: 'font-medium' }, 'Auto Backup'),
              React.createElement('p', { className: 'text-sm text-gray-500' }, 
                'Automatically backup database at scheduled intervals')
            ),
            React.createElement('input', {
              type: 'checkbox',
              checked: config.autoBackup,
              onChange: (e) => setConfig(prev => ({ ...prev, autoBackup: e.target.checked })),
              className: 'rounded border-gray-300 text-blue-600 focus:ring-blue-500'
            })
          ),

          config.autoBackup && React.createElement(Select, {
            label: 'Backup Interval',
            value: config.backupInterval,
            onChange: (e) => setConfig(prev => ({ ...prev, backupInterval: e.target.value })),
            options: [
              { value: 'hourly', label: 'Hourly' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' }
            ]
          }),

          React.createElement(Select, {
            label: 'Log Level',
            value: config.logLevel,
            onChange: (e) => setConfig(prev => ({ ...prev, logLevel: e.target.value })),
            options: [
              { value: 'error', label: 'Error' },
              { value: 'warning', label: 'Warning' },
              { value: 'info', label: 'Info' },
              { value: 'debug', label: 'Debug' }
            ]
          }),

          React.createElement(Input, {
            label: 'Session Timeout (minutes)',
            type: 'number',
            value: config.sessionTimeout,
            onChange: (e) => setConfig(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) })),
            min: 5,
            max: 120
          })
        ),

        React.createElement('div', { className: 'flex justify-between pt-4' },
          React.createElement(Button, {
            variant: 'danger'
          }, 'Clear All Caches'),
          React.createElement(Button, {
            onClick: () => setSaving(true),
            loading: saving
          }, 'Save System Settings')
        )
      )
    );
  };

  // Environment Settings Component
  const EnvironmentSettings = () => {
    const [environments, setEnvironments] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingEnv, setEditingEnv] = useState(null);

    useEffect(() => {
      loadEnvironments();
    }, []);

    const loadEnvironments = async () => {
      try {
        const data = await API.get('/environments');
        setEnvironments(data);
      } catch (error) {
        console.error('Failed to load environments:', error);
      }
    };

    return React.createElement('div', { className: 'space-y-6' },
      React.createElement(ContentCard, {
        title: 'Environment Management',
        actions: React.createElement(Button, {
          size: 'sm',
          onClick: () => setShowAddModal(true),
          icon: React.createElement(Icon, { icon: ICONS.Plus, size: 16 })
        }, 'Add Environment')
      },
        React.createElement(Table, {
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'machineCount', label: 'Machines' },
            { key: 'activeOrders', label: 'Active Orders' },
            { key: 'status', label: 'Status', render: (status) =>
              React.createElement(Badge, {
                variant: status === 'active' ? 'success' : 'warning'
              }, status)
            },
            { key: 'actions', label: '', render: (_, env) =>
              React.createElement('div', { className: 'flex space-x-2' },
                React.createElement('button', {
                  onClick: () => setEditingEnv(env),
                  className: 'text-blue-600 hover:text-blue-700'
                },
                  React.createElement(Icon, { icon: ICONS.Edit, size: 16 })
                ),
                React.createElement('button', {
                  onClick: () => {},
                  className: 'text-red-600 hover:text-red-700'
                },
                  React.createElement(Icon, { icon: ICONS.Trash2, size: 16 })
                )
              )
            }
          ],
          data: environments
        })
      ),

      // Add/Edit Modal
      (showAddModal || editingEnv) && React.createElement(EnvironmentModal, {
        isOpen: true,
        onClose: () => {
          setShowAddModal(false);
          setEditingEnv(null);
        },
        environment: editingEnv,
        onSave: () => {
          loadEnvironments();
          setShowAddModal(false);
          setEditingEnv(null);
        }
      })
    );
  };

  // Environment Modal Component
  const EnvironmentModal = ({ isOpen, onClose, environment, onSave }) => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      settings: {}
    });

    useEffect(() => {
      if (environment) {
        setFormData(environment);
      }
    }, [environment]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        if (environment) {
          await API.put(`/environments/${environment.id}`, formData);
        } else {
          await API.post('/environments', formData);
        }
        onSave();
      } catch (error) {
        console.error('Failed to save environment:', error);
      }
    };

    return React.createElement(Modal, {
      isOpen,
      onClose,
      title: environment ? 'Edit Environment' : 'Add Environment'
    },
      React.createElement('form', {
        onSubmit: handleSubmit,
        className: 'space-y-4'
      },
        React.createElement(Input, {
          label: 'Name',
          value: formData.name,
          onChange: (e) => setFormData(prev => ({ ...prev, name: e.target.value })),
          required: true
        }),
        React.createElement('div', {},
          React.createElement('label', {
            className: 'block text-sm font-medium text-gray-700 mb-1'
          }, 'Description'),
          React.createElement('textarea', {
            value: formData.description,
            onChange: (e) => setFormData(prev => ({ ...prev, description: e.target.value })),
            rows: 3,
            className: 'block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm'
          })
        ),
        React.createElement('div', {
          className: 'flex justify-end space-x-3 pt-4'
        },
          React.createElement(Button, {
            type: 'button',
            variant: 'ghost',
            onClick: onClose
          }, 'Cancel'),
          React.createElement(Button, {
            type: 'submit',
            variant: 'primary'
          }, environment ? 'Update' : 'Create')
        )
      )
    );
  };

  return {
    SettingsPage,
    GeneralSettings,
    ProfileSettings,
    NotificationSettings,
    SystemSettings,
    EnvironmentSettings
  };
});
