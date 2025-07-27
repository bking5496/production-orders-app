// admin.jsx - Beautiful JSX version
import React from 'react';

const AdminPanel = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-2">Manage system settings and users</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AdminCard
          title="User Management"
          description="Add, edit, and remove users"
          icon="👥"
          onClick={() => console.log('Users')}
        />
        <AdminCard
          title="System Settings"
          description="Configure system parameters"
          icon="⚙️"
          onClick={() => console.log('Settings')}
        />
        <AdminCard
          title="Database Backup"
          description="Backup and restore data"
          icon="💾"
          onClick={() => console.log('Backup')}
        />
        <AdminCard
          title="Activity Logs"
          description="View system activity"
          icon="📋"
          onClick={() => console.log('Logs')}
        />
        <AdminCard
          title="Reports"
          description="Generate system reports"
          icon="📊"
          onClick={() => console.log('Reports')}
        />
        <AdminCard
          title="Maintenance"
          description="System maintenance tools"
          icon="🔧"
          onClick={() => console.log('Maintenance')}
        />
      </div>
    </div>
  );
};

const AdminCard = ({ title, description, icon, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow text-left"
  >
    <div className="flex items-center space-x-4">
      <span className="text-3xl">{icon}</span>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </div>
  </button>
);

export default AdminPanel;
