import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Download, Filter, BarChart3, PieChart, TrendingUp, FileText, Printer, RefreshCw, X, Search, ArrowDown, ArrowUp, Eye, Home, ArrowLeft } from 'lucide-react';
import API from '../core/api';
import Time from '../core/time';

// Report filter component
const ReportFilters = ({ onFiltersChange, machines = [], orders = [], categories = [] }) => {
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end_date: new Date().toISOString().split('T')[0], // Today
    machine_id: '',
    order_id: '',
    category_id: '',
    waste_type: '',
    status: ''
  });

  const wasteTypes = [
    'Material Spillage', 'Defective Products', 'Packaging Waste', 'Raw Material Spoilage',
    'Processing Loss', 'Quality Rejection', 'Overproduction', 'Setup Waste', 'Other'
  ];

  const statusOptions = ['active', 'investigating', 'resolving', 'resolved', 'approved'];

  const handleFilterChange = useCallback((key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-3 bg-blue-600 rounded-xl">
          <Filter className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Report Filters</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Machine</label>
          <select
            value={filters.machine_id}
            onChange={(e) => handleFilterChange('machine_id', e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">All Machines</option>
            {machines.map(machine => (
              <option key={machine.id} value={machine.id}>{machine.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Order</label>
          <select
            value={filters.order_id}
            onChange={(e) => handleFilterChange('order_id', e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">All Orders</option>
            {orders.map(order => (
              <option key={order.id} value={order.id}>{order.order_number} - {order.product_name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Waste Type</label>
          <select
            value={filters.waste_type}
            onChange={(e) => handleFilterChange('waste_type', e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">All Types</option>
            {wasteTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Downtime Category</label>
          <select
            value={filters.category_id}
            onChange={(e) => handleFilterChange('category_id', e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.category_name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

// Summary cards component
const SummaryCards = ({ wasteData = [], downtimeData = [] }) => {
  const wasteSummary = useMemo(() => {
    const totalRecords = wasteData.length;
    const totalCost = wasteData.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0);
    const totalQuantity = wasteData.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    return { totalRecords, totalCost, totalQuantity };
  }, [wasteData]);

  const downtimeSummary = useMemo(() => {
    const totalIncidents = downtimeData.length;
    const totalDuration = downtimeData.reduce((sum, item) => sum + (parseInt(item.duration_minutes) || 0), 0);
    const totalCost = downtimeData.reduce((sum, item) => sum + (parseFloat(item.cost_impact) || 0), 0);
    return { totalIncidents, totalDuration, totalCost };
  }, [downtimeData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Waste Records</h3>
          <BarChart3 className="w-8 h-8" />
        </div>
        <div className="text-3xl font-bold">{wasteSummary.totalRecords}</div>
        <div className="text-red-100">Total incidents</div>
      </div>
      
      <div className="bg-gradient-to-br from-orange-600 to-amber-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Waste Cost</h3>
          <TrendingUp className="w-8 h-8" />
        </div>
        <div className="text-3xl font-bold">R{wasteSummary.totalCost.toFixed(2)}</div>
        <div className="text-orange-100">Total cost impact</div>
      </div>
      
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Downtime Events</h3>
          <PieChart className="w-8 h-8" />
        </div>
        <div className="text-3xl font-bold">{downtimeSummary.totalIncidents}</div>
        <div className="text-purple-100">Total incidents</div>
      </div>
      
      <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Downtime Duration</h3>
          <Calendar className="w-8 h-8" />
        </div>
        <div className="text-3xl font-bold">{Math.round(downtimeSummary.totalDuration / 60)}h</div>
        <div className="text-blue-100">{downtimeSummary.totalDuration} minutes</div>
      </div>
    </div>
  );
};

// Data table component
const DataTable = ({ data = [], type = 'waste', onExport }) => {
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField, sortDirection]);

  const sortedData = useMemo(() => {
    if (!sortField) return data;
    
    return [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [data, sortField, sortDirection]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowDown className="w-4 h-4 opacity-30" />;
    return sortDirection === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />;
  };

  const exportToCSV = useCallback(() => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [data, type]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-green-600 rounded-xl">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {type === 'waste' ? 'Waste' : 'Downtime'} Report Data
          </h2>
        </div>
        
        <button
          onClick={exportToCSV}
          className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Export CSV</span>
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {type === 'waste' ? (
                <>
                  <th className="px-6 py-4 text-left">
                    <button onClick={() => handleSort('recorded_at')} className="flex items-center space-x-2 font-semibold text-gray-700">
                      <span>Date</span>
                      <SortIcon field="recorded_at" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button onClick={() => handleSort('order_number')} className="flex items-center space-x-2 font-semibold text-gray-700">
                      <span>Order</span>
                      <SortIcon field="order_number" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button onClick={() => handleSort('waste_type')} className="flex items-center space-x-2 font-semibold text-gray-700">
                      <span>Type</span>
                      <SortIcon field="waste_type" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button onClick={() => handleSort('quantity')} className="flex items-center space-x-2 font-semibold text-gray-700">
                      <span>Quantity</span>
                      <SortIcon field="quantity" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button onClick={() => handleSort('recorded_by_name')} className="flex items-center space-x-2 font-semibold text-gray-700">
                      <span>Recorded By</span>
                      <SortIcon field="recorded_by_name" />
                    </button>
                  </th>
                </>
              ) : (
                <>
                  <th className="px-6 py-4 text-left">
                    <button onClick={() => handleSort('start_time')} className="flex items-center space-x-2 font-semibold text-gray-700">
                      <span>Start Time</span>
                      <SortIcon field="start_time" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button onClick={() => handleSort('machine_name')} className="flex items-center space-x-2 font-semibold text-gray-700">
                      <span>Machine</span>
                      <SortIcon field="machine_name" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button onClick={() => handleSort('category_name')} className="flex items-center space-x-2 font-semibold text-gray-700">
                      <span>Category</span>
                      <SortIcon field="category_name" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button onClick={() => handleSort('duration_minutes')} className="flex items-center space-x-2 font-semibold text-gray-700">
                      <span>Duration</span>
                      <SortIcon field="duration_minutes" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button onClick={() => handleSort('status')} className="flex items-center space-x-2 font-semibold text-gray-700">
                      <span>Status</span>
                      <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button onClick={() => handleSort('reported_by_name')} className="flex items-center space-x-2 font-semibold text-gray-700">
                      <span>Reported By</span>
                      <SortIcon field="reported_by_name" />
                    </button>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {type === 'waste' ? (
                  <>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {Time.format(new Date(item.recorded_at), 'datetime')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.order_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.waste_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.quantity} {item.unit}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.recorded_by_name || item.recorded_by_username}</td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {Time.format(new Date(item.start_time), 'datetime')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.machine_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.category_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.duration_minutes || item.estimated_duration || 0} min</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        item.status === 'active' ? 'bg-red-100 text-red-800' :
                        item.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.reported_by_name}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {sortedData.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No data found for the selected filters</div>
        </div>
      )}
    </div>
  );
};

// Main reports component
const WasteDowntimeReports = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('waste');
  const [isLoading, setIsLoading] = useState(false);
  const [wasteData, setWasteData] = useState([]);
  const [downtimeData, setDowntimeData] = useState([]);
  const [machines, setMachines] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({});

  // Load reference data
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [machinesRes, ordersRes, categoriesRes] = await Promise.all([
          API.get('/api/machines'),
          API.get('/api/orders'),
          API.get('/api/downtime-categories')
        ]);
        
        setMachines(machinesRes.data || []);
        setOrders(ordersRes.data || []);
        setCategories(categoriesRes.data || []);
      } catch (error) {
        console.error('Error loading reference data:', error);
      }
    };
    
    loadReferenceData();
  }, []);

  // Load report data
  const loadReportData = useCallback(async (newFilters = filters) => {
    try {
      setIsLoading(true);
      
      const queryParams = new URLSearchParams();
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const [wasteRes, downtimeRes] = await Promise.all([
        API.get(`/api/waste/reports?${queryParams.toString()}`),
        API.get(`/api/downtime/reports?${queryParams.toString()}`)
      ]);
      
      setWasteData(wasteRes.data || []);
      setDowntimeData(downtimeRes.data || []);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
    loadReportData(newFilters);
  }, [loadReportData]);

  // Initial load
  useEffect(() => {
    loadReportData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-indigo-600 rounded-2xl">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Waste & Downtime Reports</h1>
              <p className="text-xl text-gray-600">Comprehensive analysis and data export</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => window.location.href = '/supervisor'}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('waste')}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
              activeTab === 'waste' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6" />
              <span>Waste Reports</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('downtime')}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
              activeTab === 'downtime' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <PieChart className="w-6 h-6" />
              <span>Downtime Reports</span>
            </div>
          </button>
        </div>
      </div>

      {/* Filters */}
      <ReportFilters
        onFiltersChange={handleFiltersChange}
        machines={machines}
        orders={orders}
        categories={categories}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mr-4" />
          <span className="text-xl text-gray-600">Loading report data...</span>
        </div>
      )}

      {/* Summary cards */}
      {!isLoading && (
        <>
          <SummaryCards wasteData={wasteData} downtimeData={downtimeData} />
          
          {/* Data table */}
          <DataTable
            data={activeTab === 'waste' ? wasteData : downtimeData}
            type={activeTab}
          />
        </>
      )}
    </div>
  );
};

export default WasteDowntimeReports;