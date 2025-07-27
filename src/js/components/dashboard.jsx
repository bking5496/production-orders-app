// dashboard.jsx - Beautiful JSX version
import React, { useState, useEffect } from 'react';
import API from '../core/api.js';

export default function Dashboard() {
  const [stats, setStats] = useState({
    orders: { total: 0, active: 0, completed: 0 },
    machines: { total: 0, running: 0, idle: 0 },
    production: { efficiency: 0, output: 0 }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load orders with error handling
      const orders = await API.getOrders().catch(() => []);
      const machines = await API.getMachines().catch(() => []);
      
      // Calculate stats
      const activeOrders = orders.filter(o => o.status === 'active').length;
      const completedOrders = orders.filter(o => o.status === 'completed').length;
      const runningMachines = machines.filter(m => m.status === 'running').length;
      
      setStats({
        orders: {
          total: orders.length,
          active: activeOrders,
          completed: completedOrders
        },
        machines: {
          total: machines.length,
          running: runningMachines,
          idle: machines.length - runningMachines
        },
        production: {
          efficiency: runningMachines > 0 ? Math.round((runningMachines / machines.length) * 100) : 0,
          output: orders.length * 150 // Mock calculation
        }
      });
      
      setRecentOrders(orders.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Orders"
          value={stats.orders.total}
          subtitle={`${stats.orders.active} active`}
          color="blue"
        />
        <StatCard
          title="Machines"
          value={stats.machines.total}
          subtitle={`${stats.machines.running} running`}
          color="green"
        />
        <StatCard
          title="Efficiency"
          value={`${stats.production.efficiency}%`}
          subtitle="Production rate"
          color="purple"
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
        </div>
        <div className="p-6">
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent orders</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Clean component for stats
const StatCard = ({ title, value, subtitle, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <span className="text-2xl">📊</span>
        </div>
      </div>
    </div>
  );
};

// Clean component for order rows
const OrderRow = ({ order }) => (
  <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
    <div>
      <p className="font-medium">{order.name || `Order #${order.id}`}</p>
      <p className="text-sm text-gray-500">{order.product || 'Product'}</p>
    </div>
    <span className={`px-2 py-1 text-xs rounded ${
      order.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
    }`}>
      {order.status || 'pending'}
    </span>
  </div>
);
