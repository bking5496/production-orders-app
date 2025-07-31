import React, { useState, useEffect, useMemo } from 'react';
import { Clock, AlertTriangle, TrendingDown, BarChart3, Download, Filter, Calendar } from 'lucide-react';
import API from '../core/api';
import { Modal, Card, Button, Badge } from './ui-components.jsx';
import Time from '../core/time';

export default function DowntimeReport() {
  const [downtimeData, setDowntimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    start_date: Time.formatSASTDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // Last 7 days
    end_date: Time.formatSASTDate(new Date()),
    machine_id: '',
    category: ''
  });

  const loadDowntimeData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await API.get(`/reports/downtime?${queryParams}`);
      setDowntimeData(response);
    } catch (error) {
      setError('Failed to load downtime data');
      console.error('Downtime report error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDowntimeData();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadDowntimeData();
  };

  const exportData = () => {
    if (!downtimeData) return;
    
    const csvContent = [
      ['Start Time', 'End Time', 'Duration (min)', 'Reason', 'Category', 'Order', 'Machine', 'Stopped By', 'Status'],
      ...downtimeData.records.map(record => [
        Time.formatSASTDateTime(record.start_time),
        record.end_time ? Time.formatSASTDateTime(record.end_time) : 'Active',
        record.duration || 'N/A',
        record.reason,
        record.category,
        record.order_number,
        record.machine_name,
        record.stopped_by,
        record.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `downtime-report-${filters.start_date}-to-${filters.end_date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getReasonColor = (reason) => {
    const colors = {
      machine_breakdown: 'danger',
      material_shortage: 'warning',
      quality_issue: 'danger',
      operator_break: 'info',
      shift_change: 'info',
      maintenance: 'warning',
      safety_incident: 'danger',
      power_outage: 'danger',
      other: 'default'
    };
    return colors[reason] || 'default';
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Clock className="w-5 h-5 animate-spin" />
          Loading downtime report...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 text-red-800 p-4 rounded-lg">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          {error}
        </div>
      </div>
    );
  }

  const { summary, category_breakdown, records } = downtimeData || {};

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Downtime Report</h1>
          <p className="text-gray-600 mt-1">Production stop analysis and tracking</p>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={applyFilters} disabled={loading}>
            <Filter className="w-4 h-4 mr-2" />
            Apply Filters
          </Button>
          <Button onClick={exportData} variant="outline" disabled={!downtimeData}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="Equipment">Equipment</option>
              <option value="Material">Material</option>
              <option value="Quality">Quality</option>
              <option value="Planned">Planned</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Safety">Safety</option>
              <option value="Utilities">Utilities</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Total Stops</p>
                <p className="text-2xl font-bold text-gray-800">{summary.total_stops}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">Active Stops</p>
                <p className="text-2xl font-bold text-orange-600">{summary.active_stops}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Downtime</p>
                <p className="text-2xl font-bold text-blue-600">{summary.total_downtime_hours}h</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Avg Duration</p>
                <p className="text-2xl font-bold text-purple-600">{summary.average_downtime_minutes}m</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{summary.resolved_stops}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Category Breakdown */}
      {category_breakdown && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Breakdown by Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(category_breakdown).map(([category, data]) => (
              <div key={category} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800">{category}</h4>
                <p className="text-sm text-gray-600">{data.count} stops</p>
                <p className="text-sm text-gray-600">{Math.round(data.total_minutes)} minutes</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Detailed Records */}
      <Card>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Downtime Records</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Start Time', 'Duration', 'Reason', 'Category', 'Order', 'Machine', 'Status', 'Stopped By'].map(header => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records?.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-gray-500">
                    No downtime records found for the selected period
                  </td>
                </tr>
              ) : (
                records?.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Time.formatSASTDateTime(record.start_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.duration ? `${record.duration}m` : 'Active'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getReasonColor(record.reason)} size="sm">
                        {record.reason.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.machine_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={record.status === 'Active' ? 'warning' : 'success'} size="sm">
                        {record.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.stopped_by}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}