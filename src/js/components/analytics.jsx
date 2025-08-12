import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Download, RefreshCw, Calendar, 
  Clock, Target, Activity, AlertTriangle, CheckCircle, Package, Users,
  Factory, PieChart, LineChart, Filter, Search, Settings, Play, Pause,
  FileText, Eye, Edit3, Save, X
} from 'lucide-react';
import API from '../core/api';
import Time from '../core/time';
import { Modal, Card, Button, Badge } from './ui-components.jsx';
import DowntimeReport from './downtime-report.jsx';
import { useAutoConnect } from '../core/websocket-hooks.js';
import { WebSocketStatusCompact } from './websocket-status.jsx';

export default function AnalyticsPage() {
  // Helper function to ensure array response
  const ensureArray = (data, label = 'data') => {
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    console.warn(`⚠️ ${label} is not an array:`, data);
    return [];
  };

  // WebSocket integration
  useAutoConnect();
  
  const [analytics, setAnalytics] = useState({
    orders: [],
    machines: [],
    assignments: [],
    employees: [],
    summary: {},
    archivedOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [wasteReports, setWasteReports] = useState([]);
  const [selectedWasteReport, setSelectedWasteReport] = useState(null);
  const [showWasteReportModal, setShowWasteReportModal] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() is 0-based, so add 1
    
    // Format first day of month as YYYY-MM-01
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    
    // Format current date as YYYY-MM-DD
    const endDate = now.toISOString().split('T')[0];
    
    return {
      start_date: startDate,
      end_date: endDate
    };
  });

  // Notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Load analytics data
  const loadAnalytics = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    
    try {
      // Create proper date range with time components
      const startDateTime = `${dateRange.start_date}T00:00:00`;
      const endDateTime = `${dateRange.end_date}T23:59:59`;
      
      const params = new URLSearchParams({
        start_date: startDateTime,
        end_date: endDateTime
      }).toString();
      
      const [ordersData, machinesData, summaryData, downtimeData, downtimeRecordsData, employeesData, assignmentsData] = await Promise.all([
        API.get('/orders'),
        API.get('/machines'),
        API.get(`/analytics/summary?${params}`),
        API.get(`/analytics/downtime?${params}`),
        API.get(`/reports/downtime?${params}`),
        API.get('/users'),
        API.get(`/planner/assignments?date=${dateRange.end_date}`)
      ]);
      
      setAnalytics({
        orders: ensureArray(ordersData, 'orders'),
        machines: ensureArray(machinesData, 'machines'),
        employees: ensureArray(employeesData, 'employees'),
        assignments: ensureArray(assignmentsData, 'assignments'),
        summary: summaryData?.data?.summary || summaryData?.summary || {},
        downtime: downtimeData?.data || downtimeData || {},
        downtimeRecords: downtimeRecordsData?.data?.records || downtimeRecordsData?.records || [],
        downtimeSummary: downtimeRecordsData?.data?.summary || downtimeRecordsData?.summary || {},
        categoryBreakdown: downtimeRecordsData?.data?.category_breakdown || downtimeRecordsData?.category_breakdown || {}
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
      showNotification('Failed to load analytics data', 'danger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadAnalytics(true);
  };

  useEffect(() => {
    // Check authentication before loading analytics
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No authentication token found - user needs to log in');
      showNotification('Please log in to access analytics data', 'danger');
      setLoading(false);
      return;
    }
    
    loadAnalytics();
  }, [dateRange]);
  
  // Load completed orders after initial analytics load
  useEffect(() => {
    // Check authentication before loading waste data
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No authentication token found - skipping waste data load');
      return;
    }
    
    loadCompletedOrdersWithWaste();
  }, [dateRange]);

  // Load completed orders with waste data from archives
  const loadCompletedOrdersWithWaste = async () => {
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      }).toString();
      
      // Load from archived/completed orders
      const [archivedOrders, wasteData] = await Promise.all([
        API.get(`/orders/archived?${params}`).catch(() => []),
        API.get(`/reports/waste?${params}`).catch(() => [])
      ]);
      
      // Update analytics with archived orders
      const completedOrders = archivedOrders?.data || archivedOrders || [];
      const wasteReportsData = wasteData?.data || wasteData || [];
      
      // Replace archived orders (don't append to avoid duplicates)
      setAnalytics(prev => ({
        ...prev,
        archivedOrders: completedOrders
      }));
      
      setWasteReports(wasteReportsData);
      
      console.log('Loaded archived orders:', completedOrders.length);
    } catch (error) {
      console.error('Failed to load archived orders:', error);
      // Try alternative endpoint
      try {
        const params = new URLSearchParams({
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
          status: 'completed'
        }).toString();
        
        const completedOrdersResponse = await API.get(`/orders?${params}&archived=true`);
        const completedOrders = completedOrdersResponse?.data || completedOrdersResponse || [];
        setAnalytics(prev => ({
          ...prev,
          archivedOrders: completedOrders
        }));
        console.log('Loaded completed orders from alternative endpoint:', completedOrders.length);
      } catch (altError) {
        console.error('Alternative archived orders endpoint also failed:', altError);
      }
    }
  };

  // View waste report for order
  const viewWasteReport = async (order) => {
    try {
      // Get waste data for this specific order
      const wasteDataResponse = await API.get(`/orders/${order.id}/waste`);
      const wasteData = wasteDataResponse?.data || wasteDataResponse || [];
      
      setSelectedWasteReport({
        order,
        wasteData: wasteData,
        metrics: wasteData.length > 0 ? {
          totalWeight: wasteData.reduce((sum, w) => sum + (w.weight || 0), 0),
          itemCount: wasteData.length,
          categories: [...new Set(wasteData.map(w => w.item_type))]
        } : { totalWeight: 0, itemCount: 0, categories: [] }
      });
      setShowWasteReportModal(true);
    } catch (error) {
      console.error('Failed to load waste report:', error);
      showNotification('Failed to load waste report', 'danger');
    }
  };

  // Get all completed orders (active + archived)
  const getAllCompletedOrders = () => {
    const activeCompleted = analytics.orders.filter(o => o.status === 'completed');
    const archivedCompleted = analytics.archivedOrders || [];
    return [...activeCompleted, ...archivedCompleted];
  };
  
  // Get waste summary for all completed orders
  const getWasteSummary = () => {
    const completedOrders = getAllCompletedOrders();
    const ordersWithWaste = completedOrders.filter(o => o.waste_data && o.waste_data.length > 0);
    
    const totalWaste = completedOrders.reduce((sum, order) => {
      if (order.waste_data) {
        return sum + order.waste_data.reduce((orderSum, waste) => orderSum + (waste.weight || 0), 0);
      }
      return sum;
    }, 0);
    
    return {
      totalOrders: completedOrders.length,
      ordersWithWaste: ordersWithWaste.length,
      totalWasteWeight: totalWaste,
      wastePercentage: completedOrders.length > 0 ? Math.round((ordersWithWaste.length / completedOrders.length) * 100) : 0
    };
  };

  // Export waste reports
  const exportWasteReports = () => {
    try {
      const completedOrders = getAllCompletedOrders();
      
      if (completedOrders.length === 0) {
        showNotification('No completed orders to export', 'warning');
        return;
      }

      const csvContent = [
        ['Order Number', 'Product', 'Completion Date', 'Target Qty', 'Actual Qty', 'Waste Items', 'Total Waste Weight', 'Waste Types'],
        ...completedOrders.map(order => {
          const wasteData = order.waste_data || [];
          const totalWaste = wasteData.reduce((sum, w) => sum + (w.weight || 0), 0);
          const wasteTypes = [...new Set(wasteData.map(w => w.item_type))].join('; ');
          
          return [
            order.order_number || 'N/A',
            order.product_name || 'N/A',
            order.complete_time ? Time.formatSASTDateTime(order.complete_time) : 'N/A',
            order.quantity || 0,
            order.actual_quantity || 0,
            wasteData.length,
            totalWaste,
            wasteTypes || 'No waste recorded'
          ];
        })
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `waste-reports-${dateRange.start_date}-to-${dateRange.end_date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      showNotification('Waste reports exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export waste reports', 'danger');
    }
  };

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const { orders, machines } = analytics;
    
    // Order metrics
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const pausedOrders = orders.filter(o => o.status === 'paused').length;
    
    // Completion rate
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    
    // Machine metrics
    const totalMachines = machines.length;
    const availableMachines = machines.filter(m => m.status === 'available').length;
    const activeMachines = machines.filter(m => m.status === 'in_use').length;
    const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;
    const offlineMachines = machines.filter(m => m.status === 'offline').length;
    
    // Utilization rate
    const utilizationRate = totalMachines > 0 ? Math.round((activeMachines / totalMachines) * 100) : 0;
    
    // Quantity metrics
    const totalQuantityOrdered = orders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);
    const totalQuantityProduced = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (parseInt(o.actual_quantity || o.quantity) || 0), 0);
    
    // Priority distribution
    const priorityDistribution = orders.reduce((acc, order) => {
      const priority = order.priority || 'normal';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});
    
    // Environment distribution
    const environmentDistribution = orders.reduce((acc, order) => {
      const env = order.environment || 'unknown';
      acc[env] = (acc[env] || 0) + 1;
      return acc;
    }, {});
    
    // Status distribution
    const statusDistribution = orders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    // Machine environment distribution
    const machineEnvDistribution = machines.reduce((acc, machine) => {
      const env = machine.environment || 'unknown';
      acc[env] = (acc[env] || 0) + 1;
      return acc;
    }, {});
    
    // Recent orders trend (last 7 days)
    const recentTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const ordersCount = orders.filter(o => o.created_at?.startsWith(dateStr)).length;
      return { date: dateStr, count: ordersCount };
    }).reverse();
    
    return {
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      pausedOrders,
      completionRate,
      totalMachines,
      availableMachines,
      activeMachines,
      maintenanceMachines,
      offlineMachines,
      utilizationRate,
      totalQuantityOrdered,
      totalQuantityProduced,
      priorityDistribution,
      environmentDistribution,
      statusDistribution,
      machineEnvDistribution,
      recentTrend
    };
  }, [analytics]);

  // Export functionality
  const exportData = (format) => {
    try {
      let exportContent;
      let filename;
      
      if (format === 'csv') {
        const csvData = [
          ['Metric', 'Value'],
          ['Total Orders', metrics.totalOrders],
          ['Completed Orders', metrics.completedOrders],
          ['Completion Rate', `${metrics.completionRate}%`],
          ['Total Machines', metrics.totalMachines],
          ['Active Machines', metrics.activeMachines],
          ['Utilization Rate', `${metrics.utilizationRate}%`],
          ['Total Quantity Ordered', metrics.totalQuantityOrdered],
          ['Total Quantity Produced', metrics.totalQuantityProduced]
        ];
        
        exportContent = csvData.map(row => row.join(',')).join('\\n');
        filename = `analytics-${dateRange.start_date}-to-${dateRange.end_date}.csv`;
        
        const blob = new Blob([exportContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        exportContent = JSON.stringify({ metrics, dateRange }, null, 2);
        filename = `analytics-${dateRange.start_date}-to-${dateRange.end_date}.json`;
        
        const blob = new Blob([exportContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      
      showNotification(`Analytics exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      showNotification('Failed to export data', 'danger');
    }
  };

  // Downtime export functionality
  const exportDowntimeData = () => {
    try {
      if (!analytics.downtimeRecords || analytics.downtimeRecords.length === 0) {
        showNotification('No downtime records to export', 'warning');
        return;
      }

      const csvContent = [
        ['Start Time', 'End Time', 'Duration (min)', 'Reason', 'Category', 'Order', 'Machine', 'Stopped By', 'Supervisor on Duty', 'Shift', 'Status', 'Notes'],
        ...analytics.downtimeRecords.map(record => [
          record.start_time || 'N/A',
          record.end_time || 'Active',
          record.duration || 'N/A',
          record.reason || 'N/A',
          record.category || 'N/A',
          record.order_number || 'N/A',
          record.machine_name || 'N/A',
          record.stopped_by || 'N/A',
          record.supervisor_on_duty || 'N/A',
          record.shift || 'N/A',
          record.status || 'N/A',
          (record.notes || '').replace(/,/g, ';') // Replace commas to avoid CSV parsing issues
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `downtime-report-${dateRange.start_date}-to-${dateRange.end_date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      showNotification('Downtime report exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export downtime data', 'danger');
    }
  };

  // Enhanced Chart components with better styling
  const BarChart = ({ data, title, color = '#3b82f6' }) => {
    const canvasRef = useRef(null);
    
    useEffect(() => {
      if (!canvasRef.current || !data) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const labels = Object.keys(data);
      const values = Object.values(data);
      const maxValue = Math.max(...values, 1);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (labels.length === 0) {
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        ctx.font = '12px sans-serif';
        ctx.fillText('Adjust date range to view data', canvas.width / 2, canvas.height / 2 + 25);
        return;
      }
      
      const chartHeight = canvas.height - 80;
      const chartWidth = canvas.width - 80;
      const barWidth = Math.min(60, chartWidth / (labels.length * 1.5));
      
      // Draw enhanced grid lines
      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = 40 + (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(canvas.width - 20, y);
        ctx.stroke();
        
        // Enhanced Y-axis labels
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round((5 - i) / 5 * maxValue), 45, y + 4);
      }
      
      // Draw enhanced bars with gradients
      labels.forEach((label, i) => {
        const value = values[i];
        const barHeight = (value / maxValue) * chartHeight;
        const x = 60 + i * (chartWidth / labels.length);
        const y = 40 + chartHeight - barHeight;
        
        // Create gradient for bar
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + '80');
        
        // Bar with gradient and rounded corners
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Bar border for better definition
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Enhanced value display on bars
        if (barHeight > 20) {
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(value, x + barWidth / 2, y + barHeight / 2 + 4);
        } else {
          // Value above bar if bar is too small
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#374151';
          ctx.textAlign = 'center';
          ctx.fillText(value, x + barWidth / 2, y - 8);
        }
        
        // Enhanced labels with better rotation
        ctx.save();
        ctx.translate(x + barWidth / 2, canvas.height - 15);
        ctx.rotate(-Math.PI / 8);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#4b5563';
        ctx.textAlign = 'center';
        ctx.fillText(label.charAt(0).toUpperCase() + label.slice(1), 0, 0);
        ctx.restore();
      });
    }, [data, color]);
    
    return (
      <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: color }}></div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <canvas ref={canvasRef} width="400" height="300" className="w-full h-auto max-w-full"></canvas>
        </div>
      </Card>
    );
  };

  const PieChart = ({ data, title }) => {
    const canvasRef = useRef(null);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];
    
    useEffect(() => {
      if (!canvasRef.current || !data) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 - 10;
      const radius = Math.min(centerX, centerY) - 50;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const values = Object.values(data);
      const labels = Object.keys(data);
      const total = values.reduce((sum, val) => sum + val, 0);
      
      if (total === 0) {
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', centerX, centerY);
        ctx.font = '12px sans-serif';
        ctx.fillText('Adjust date range to view data', centerX, centerY + 25);
        return;
      }
      
      let currentAngle = -Math.PI / 2;
      
      // Draw shadow for depth
      values.forEach((value, i) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX + 3, centerY + 3);
        ctx.arc(centerX + 3, centerY + 3, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fill();
        
        currentAngle += sliceAngle;
      });
      
      // Reset angle for main chart
      currentAngle = -Math.PI / 2;
      
      // Draw enhanced slices with gradients
      values.forEach((value, i) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        const color = colors[i % colors.length];
        
        // Create radial gradient for each slice
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, color + 'cc');
        gradient.addColorStop(1, color);
        
        // Draw slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw enhanced percentage labels
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.75);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.75);
        
        const percentage = Math.round((value / total) * 100);
        if (percentage > 8) {
          // Add background circle for percentage
          ctx.beginPath();
          ctx.arc(labelX, labelY, 18, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.fillText(`${percentage}%`, labelX, labelY + 4);
        }
        
        currentAngle += sliceAngle;
      });
      
    }, [data]);
    
    const values = Object.values(data || {});
    const labels = Object.keys(data || {});
    const total = values.reduce((sum, val) => sum + val, 0);
    
    return (
      <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="bg-gray-50 rounded-lg p-4 flex-shrink-0">
            <canvas ref={canvasRef} width="300" height="250" className="max-w-full h-auto"></canvas>
          </div>
          
          {/* Enhanced Legend */}
          {total > 0 && (
            <div className="flex-1 space-y-3">
              <h4 className="font-medium text-gray-700 text-sm uppercase tracking-wide">Distribution</h4>
              {labels.map((label, i) => {
                const value = values[i];
                const percentage = Math.round((value / total) * 100);
                const color = colors[i % colors.length];
                
                return (
                  <div key={label} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: color }}></div>
                      <span className="font-medium text-gray-700 capitalize">{label}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-800">{value}</div>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const StatsCard = ({ title, value, change, icon: Icon, color = "gray" }) => {
    const colorConfig = {
      blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", icon: "text-blue-500", gradient: "from-blue-500 to-blue-600" },
      green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200", icon: "text-green-500", gradient: "from-green-500 to-green-600" },
      yellow: { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-200", icon: "text-yellow-500", gradient: "from-yellow-500 to-yellow-600" },
      red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200", icon: "text-red-500", gradient: "from-red-500 to-red-600" },
      purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", icon: "text-purple-500", gradient: "from-purple-500 to-purple-600" },
      orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", icon: "text-orange-500", gradient: "from-orange-500 to-orange-600" },
      gray: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", icon: "text-gray-500", gradient: "from-gray-500 to-gray-600" }
    };
    
    const config = colorConfig[color];
    
    return (
      <Card className={`p-6 border-l-4 ${config.bg} ${config.border} hover:shadow-lg transition-all duration-300 group`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-2 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-800 mb-1 group-hover:scale-105 transition-transform duration-200">{value}</p>
            {change !== undefined && (
              <div className="flex items-center mt-2">
                {change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(change)}% from last period
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${config.gradient} shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>
      </Card>
    );
  };

  if (loading && Object.keys(analytics).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-blue-200 rounded-full animate-ping mx-auto"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">Loading Analytics Dashboard</h3>
            <p className="text-gray-600 max-w-md">
              Gathering insights from your production data...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Enhanced Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-xl z-50 transform transition-all duration-300 ease-in-out ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          notification.type === 'danger' ? 'bg-red-100 text-red-800 border border-red-200' :
          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-1 rounded-full ${
              notification.type === 'success' ? 'bg-green-200' :
              notification.type === 'danger' ? 'bg-red-200' :
              notification.type === 'warning' ? 'bg-yellow-200' :
              'bg-blue-200'
            }`}>
              {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
              {notification.type === 'danger' && <AlertTriangle className="w-4 h-4 text-red-600" />}
              {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
              {(!notification.type || notification.type === 'info') && <RefreshCw className="w-4 h-4 text-blue-600" />}
            </div>
            <span className="font-medium">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Analytics & Reports
                </h1>
                <p className="text-gray-600 text-sm">Production insights and real-time performance metrics</p>
              </div>
              <WebSocketStatusCompact />
            </div>
            
            {/* Quick Stats Preview */}
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">{metrics.totalOrders} Total Orders</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">{metrics.activeMachines} Active Machines</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-600">{metrics.completionRate}% Completion Rate</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="shadow-sm hover:shadow-md transition-shadow"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating...' : 'Refresh'}
            </Button>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => exportData('csv')} 
                variant="outline" 
                size="sm"
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button 
                onClick={() => exportData('json')} 
                variant="outline" 
                size="sm"
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Date Range Filter */}
      <Card className="p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span className="font-semibold text-gray-800">Date Range Filter</span>
              <p className="text-xs text-gray-500">Select reporting period</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input 
                type="date" 
                value={dateRange.start_date}
                onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input 
                type="date" 
                value={dateRange.end_date}
                onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex flex-col items-start lg:items-end gap-2">
            <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-800">
                {Math.ceil((new Date(dateRange.end_date) - new Date(dateRange.start_date)) / (1000 * 60 * 60 * 24))} days
              </div>
              <div className="text-xs text-blue-600">Analysis Period</div>
            </div>
            
            {refreshing && (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Updating data...</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Enhanced Navigation Tabs with Better UX */}
      <Card className="p-1 shadow-sm">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3, color: 'blue' },
            { id: 'orders', label: 'Order Analytics', icon: Package, color: 'green' },
            { id: 'machines', label: 'Machine Analytics', icon: Factory, color: 'purple' },
            { id: 'labor', label: 'Labor Analytics', icon: Users, color: 'indigo' },
            { id: 'performance', label: 'Performance', icon: TrendingUp, color: 'emerald' },
            { id: 'downtime', label: 'Downtime Report', icon: AlertTriangle, color: 'red' },
            { id: 'waste-reports', label: 'Waste Reports', icon: FileText, color: 'orange' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? `bg-${tab.color}-600 text-white shadow-md scale-105`
                    : `text-gray-600 hover:bg-${tab.color}-50 hover:text-${tab.color}-700 hover:shadow-sm`
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Orders"
              value={metrics.totalOrders}
              icon={Package}
              color="blue"
            />
            <StatsCard
              title="Completion Rate"
              value={`${metrics.completionRate}%`}
              icon={CheckCircle}
              color="green"
            />
            <StatsCard
              title="Machine Utilization"
              value={`${metrics.utilizationRate}%`}
              icon={Factory}
              color="purple"
            />
            <StatsCard
              title="Active Machines"
              value={`${metrics.activeMachines}/${metrics.totalMachines}`}
              icon={Activity}
              color="yellow"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChart
              data={metrics.statusDistribution}
              title="Order Status Distribution"
            />
            <BarChart
              data={metrics.environmentDistribution}
              title="Orders by Environment"
              color="#10b981"
            />
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Order Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatsCard
              title="Pending Orders"
              value={metrics.pendingOrders}
              icon={Clock}
              color="gray"
            />
            <StatsCard
              title="In Progress"
              value={metrics.inProgressOrders}
              icon={Play}
              color="blue"
            />
            <StatsCard
              title="Completed"
              value={metrics.completedOrders}
              icon={CheckCircle}
              color="green"
            />
            <StatsCard
              title="Paused"
              value={metrics.pausedOrders}
              icon={Pause}
              color="yellow"
            />
            <StatsCard
              title="Total Quantity"
              value={metrics.totalQuantityOrdered.toLocaleString()}
              icon={Target}
              color="purple"
            />
          </div>

          {/* Order Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BarChart
              data={metrics.priorityDistribution}
              title="Order Priority Distribution"
              color="#f59e0b"
            />
            <PieChart
              data={metrics.environmentDistribution}
              title="Orders by Environment"
            />
          </div>
        </div>
      )}

      {activeTab === 'machines' && (
        <div className="space-y-6">
          {/* Machine Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatsCard
              title="Total Machines"
              value={metrics.totalMachines}
              icon={Factory}
              color="gray"
            />
            <StatsCard
              title="Available"
              value={metrics.availableMachines}
              icon={CheckCircle}
              color="green"
            />
            <StatsCard
              title="In Use"
              value={metrics.activeMachines}
              icon={Activity}
              color="blue"
            />
            <StatsCard
              title="Maintenance"
              value={metrics.maintenanceMachines}
              icon={AlertTriangle}
              color="yellow"
            />
            <StatsCard
              title="Offline"
              value={metrics.offlineMachines}
              icon={Users}
              color="red"
            />
          </div>

          {/* Machine Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChart
              data={{
                Available: metrics.availableMachines,
                'In Use': metrics.activeMachines,
                Maintenance: metrics.maintenanceMachines,
                Offline: metrics.offlineMachines
              }}
              title="Machine Status Distribution"
            />
            <BarChart
              data={metrics.machineEnvDistribution}
              title="Machines by Environment"
              color="#8b5cf6"
            />
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Quantity Produced"
              value={metrics.totalQuantityProduced.toLocaleString()}
              icon={Target}
              color="green"
            />
            <StatsCard
              title="Production Efficiency"
              value={`${Math.round((metrics.totalQuantityProduced / (metrics.totalQuantityOrdered || 1)) * 100)}%`}
              icon={TrendingUp}
              color="blue"
            />
            <StatsCard
              title="Avg Orders/Day"
              value={Math.round(metrics.totalOrders / 30)}
              icon={Package}
              color="purple"
            />
            <StatsCard
              title="Machine Efficiency"
              value={`${metrics.utilizationRate}%`}
              icon={Factory}
              color="yellow"
            />
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 gap-6">
            <BarChart
              data={Object.fromEntries(
                analytics.downtime ? Object.entries(analytics.downtime) : [['No Data', 0]]
              )}
              title="Downtime by Reason (Minutes)"
              color="#ef4444"
            />
          </div>
          
          {/* Enhanced Performance Table */}
          <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Performance Summary</h3>
                <p className="text-sm text-gray-600">Key metrics for current reporting period</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Performance Metric</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Current Value</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Target</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Performance Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Order Completion Rate</div>
                          <div className="text-xs text-gray-500">Completed vs Total Orders</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-lg font-bold text-gray-800">{metrics.completionRate}%</div>
                      <div className="text-xs text-gray-500">{metrics.completedOrders} of {metrics.totalOrders} orders</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-600">85%</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <Badge variant={metrics.completionRate >= 85 ? 'success' : metrics.completionRate >= 70 ? 'warning' : 'danger'}>
                        {metrics.completionRate >= 85 ? '🎯 Excellent' : metrics.completionRate >= 70 ? '📈 Good' : '⚠️ Needs Improvement'}
                      </Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Factory className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Machine Utilization</div>
                          <div className="text-xs text-gray-500">Active vs Total Machines</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-lg font-bold text-gray-800">{metrics.utilizationRate}%</div>
                      <div className="text-xs text-gray-500">{metrics.activeMachines} of {metrics.totalMachines} active</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-600">80%</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <Badge variant={metrics.utilizationRate >= 80 ? 'success' : metrics.utilizationRate >= 60 ? 'warning' : 'danger'}>
                        {metrics.utilizationRate >= 80 ? '🎯 Excellent' : metrics.utilizationRate >= 60 ? '📈 Good' : '⚠️ Needs Improvement'}
                      </Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Target className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Production Efficiency</div>
                          <div className="text-xs text-gray-500">Produced vs Ordered Quantity</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-lg font-bold text-gray-800">
                        {Math.round((metrics.totalQuantityProduced / (metrics.totalQuantityOrdered || 1)) * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">{metrics.totalQuantityProduced.toLocaleString()} / {metrics.totalQuantityOrdered.toLocaleString()} units</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-600">90%</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <Badge variant={
                        (metrics.totalQuantityProduced / (metrics.totalQuantityOrdered || 1)) * 100 >= 90 ? 'success' : 
                        (metrics.totalQuantityProduced / (metrics.totalQuantityOrdered || 1)) * 100 >= 75 ? 'warning' : 'danger'
                      }>
                        {(metrics.totalQuantityProduced / (metrics.totalQuantityOrdered || 1)) * 100 >= 90 ? '🎯 Excellent' : 
                         (metrics.totalQuantityProduced / (metrics.totalQuantityOrdered || 1)) * 100 >= 75 ? '📈 Good' : '⚠️ Needs Improvement'}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'labor' && (
        <div className="space-y-6">
          {/* Labor Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Employees"
              value={analytics.employees.filter(e => e.role !== 'admin').length}
              icon={Users}
              color="blue"
            />
            <StatsCard
              title="Assigned Today"
              value={analytics.assignments.length}
              icon={CheckCircle}
              color="green"
            />
            <StatsCard
              title="Unique Workers"
              value={new Set(analytics.assignments.map(a => a.employee_id)).size}
              icon={Activity}
              color="purple"
            />
            <StatsCard
              title="Utilization"
              value={`${Math.round((analytics.assignments.length / Math.max(analytics.machines.length, 1)) * 100)}%`}
              icon={TrendingUp}
              color="orange"
            />
          </div>

          {/* Labor Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Employee Roles Distribution</h3>
                  <p className="text-sm text-gray-600">Workforce composition by role</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {['operator', 'supervisor', 'packer'].map(role => {
                  const count = analytics.employees.filter(e => e.role === role).length;
                  const totalNonAdmin = analytics.employees.filter(e => e.role !== 'admin').length;
                  const percentage = Math.round((count / Math.max(totalNonAdmin, 1)) * 100);
                  
                  const roleConfig = {
                    operator: { color: 'bg-blue-500', icon: '🔧', label: 'Operators' },
                    supervisor: { color: 'bg-purple-500', icon: '👨‍💼', label: 'Supervisors' },
                    packer: { color: 'bg-green-500', icon: '📦', label: 'Packers' }
                  };
                  
                  const config = roleConfig[role];
                  
                  return (
                    <div key={role} className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{config.icon}</span>
                          <span className="text-sm font-semibold text-gray-700">{config.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">{count}</div>
                          <div className="text-xs text-gray-500">{percentage}%</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-3 rounded-full ${config.color} transition-all duration-500 ease-out`} 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Workforce:</span>
                  <span className="font-semibold text-gray-800">{analytics.employees.filter(e => e.role !== 'admin').length} employees</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Shift Distribution</h3>
                  <p className="text-sm text-gray-600">Current assignment coverage</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {['day', 'night'].map(shift => {
                  const count = analytics.assignments.filter(a => a.shift === shift).length;
                  const percentage = Math.round((count / Math.max(analytics.assignments.length, 1)) * 100);
                  
                  const shiftConfig = {
                    day: { 
                      color: 'bg-gradient-to-r from-yellow-400 to-orange-500', 
                      icon: '☀️', 
                      label: 'Day Shift',
                      time: '06:00 - 18:00',
                      bgColor: 'bg-yellow-50',
                      textColor: 'text-yellow-700'
                    },
                    night: { 
                      color: 'bg-gradient-to-r from-blue-500 to-indigo-600', 
                      icon: '🌙', 
                      label: 'Night Shift',
                      time: '18:00 - 06:00',
                      bgColor: 'bg-blue-50',
                      textColor: 'text-blue-700'
                    }
                  };
                  
                  const config = shiftConfig[shift];
                  
                  return (
                    <div key={shift} className={`p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors ${config.bgColor}`}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{config.icon}</span>
                          <div>
                            <div className={`text-sm font-semibold ${config.textColor}`}>{config.label}</div>
                            <div className="text-xs text-gray-500">{config.time}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${config.textColor}`}>{count}</div>
                          <div className="text-xs text-gray-500">{percentage}% coverage</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-3 rounded-full ${config.color} transition-all duration-500 ease-out`} 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Assignments:</span>
                  <span className="font-semibold text-gray-800">{analytics.assignments.length} active</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Enhanced Recent Assignments Table */}
          <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Current Labor Assignments</h3>
                  <p className="text-sm text-gray-600">Active assignments for {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <Badge variant="info" className="px-3 py-1">
                {analytics.assignments.length} Active
              </Badge>
            </div>
            
            {analytics.assignments.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Assignments</h3>
                <p className="text-gray-600">No labor assignments found for the selected date.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee Details</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assignment</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Shift Schedule</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {analytics.assignments.slice(0, 10).map((assignment, index) => {
                      const employee = analytics.employees.find(e => e.id === assignment.employee_id);
                      const machine = analytics.machines.find(m => m.id == assignment.machine_id);
                      
                      const roleColors = {
                        operator: 'bg-blue-50 text-blue-700',
                        supervisor: 'bg-purple-50 text-purple-700',
                        packer: 'bg-green-50 text-green-700'
                      };
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {(employee?.fullName || employee?.username || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {employee?.fullName || employee?.username || 'Unknown Employee'}
                                </div>
                                <div className="text-xs text-gray-500">ID: {assignment.employee_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge size="sm" className={roleColors[employee?.role] || 'bg-gray-50 text-gray-700'}>
                                  {(employee?.role || 'N/A').charAt(0).toUpperCase() + (employee?.role || 'N/A').slice(1)}
                                </Badge>
                              </div>
                              <div className="text-sm font-medium text-gray-800">
                                {machine?.name || `Machine ${assignment.machine_id}`}
                              </div>
                              <div className="text-xs text-gray-500">
                                {machine?.environment || 'Unknown'} Environment
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                assignment.shift === 'day' ? 'bg-yellow-400' : 'bg-blue-500'
                              }`}></div>
                              <div className="text-sm font-medium text-gray-800 capitalize">
                                {assignment.shift} Shift
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {assignment.shift === 'day' ? '06:00 - 18:00' : '18:00 - 06:00'}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <Badge variant="success" className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              Active
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {analytics.assignments.length > 10 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Showing 10 of {analytics.assignments.length} assignments
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'downtime' && (
        <DowntimeReport />
      )}

      {activeTab === 'waste-reports' && (
        <div className="space-y-6">
          {/* Header with actions */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Waste Reports</h3>
              <p className="text-sm text-gray-600 mt-1">
                View waste tracking data for completed production orders
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={exportWasteReports} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Waste Data
              </Button>
              <Button onClick={loadCompletedOrdersWithWaste} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="Completed Orders"
              value={getAllCompletedOrders().length}
              icon={CheckCircle}
              color="green"
            />
            <StatsCard
              title="Orders with Waste"
              value={getAllCompletedOrders().filter(o => o.waste_data && o.waste_data.length > 0).length}
              icon={AlertTriangle}
              color="yellow"
            />
            <StatsCard
              title="Total Waste Weight"
              value={`${getAllCompletedOrders()
                .reduce((sum, order) => {
                  if (order.waste_data) {
                    return sum + order.waste_data.reduce((orderSum, waste) => orderSum + (waste.weight || 0), 0);
                  }
                  return sum;
                }, 0).toFixed(2)} kg`}
              icon={Package}
              color="red"
            />
            <StatsCard
              title="Waste Tracking Rate"
              value={`${getAllCompletedOrders().length > 0 ? 
                Math.round((getAllCompletedOrders().filter(o => o.waste_data && o.waste_data.length > 0).length / 
                getAllCompletedOrders().length) * 100) : 0}%`}
              icon={Target}
              color="blue"
            />
          </div>

          {/* Enhanced Completed Orders with Waste Data Table */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Completed Orders - Waste Tracking</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Comprehensive waste analysis for {(analytics.archivedOrders || []).length + analytics.orders.filter(o => o.status === 'completed').length} completed orders
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800">{analytics.orders.filter(o => o.status === 'completed').length}</div>
                  <div className="text-xs text-gray-500">Orders in period</div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Order', 'Product', 'Completion Date', 'Quantity', 'Waste Items', 'Total Waste', 'Actions'].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {analytics.orders.filter(o => o.status === 'completed').length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-16">
                        <div className="flex flex-col items-center">
                          <div className="p-4 bg-gray-100 rounded-full mb-4">
                            <CheckCircle className="w-16 h-16 text-gray-300" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Orders Found</h3>
                          <p className="text-gray-600 mb-4">No completed orders found for the selected period</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>Try adjusting the date range to view completed orders</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    analytics.orders
                      .filter(o => o.status === 'completed')
                      .map((order, index) => {
                        const wasteData = order.waste_data || [];
                        const totalWaste = wasteData.reduce((sum, waste) => sum + (waste.weight || 0), 0);
                        const hasWaste = wasteData.length > 0;
                        
                        return (
                          <tr key={order.id || index} className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                  {(order.order_number || 'O').charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {order.order_number}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Order ID: {order.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-800">{order.product_name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">Product Information</div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-800">
                                {order.complete_time ? Time.formatSASTDateTime(order.complete_time) : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">Completion Time</div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-800">{order.actual_quantity || order.quantity || 0} units</div>
                              <div className="text-xs text-gray-500">Target: {order.quantity || 0} units</div>
                              {order.actual_quantity && order.quantity && (
                                <div className={`text-xs font-medium ${
                                  order.actual_quantity >= order.quantity ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {order.actual_quantity >= order.quantity ? '✓ Target Met' : '⚠ Under Target'}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-800">{wasteData.length}</span>
                                {hasWaste ? (
                                  <Badge variant="warning" size="sm" className="flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Has Waste
                                  </Badge>
                                ) : (
                                  <Badge variant="success" size="sm" className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Clean
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              {hasWaste ? (
                                <div>
                                  <div className="text-sm font-bold text-red-600">{totalWaste.toFixed(2)} kg</div>
                                  <div className="text-xs text-gray-500 truncate max-w-32">
                                    {[...new Set(wasteData.map(w => w.item_type))].join(', ')}
                                  </div>
                                  <div className="text-xs text-red-500 font-medium">
                                    {wasteData.length} waste {wasteData.length === 1 ? 'item' : 'items'}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-gray-400">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-sm">No waste recorded</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <Button 
                                onClick={() => viewWasteReport(order)}
                                variant={hasWaste ? "default" : "outline"}
                                size="sm"
                                disabled={!hasWaste}
                                className={hasWaste ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                {hasWaste ? 'View Details' : 'No Data'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Waste Summary Charts */}
          {analytics.orders.filter(o => o.status === 'completed' && o.waste_data && o.waste_data.length > 0).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Waste by Category</h3>
                <div className="space-y-3">
                  {(() => {
                    const wasteByCategory = {};
                    analytics.orders
                      .filter(o => o.status === 'completed' && o.waste_data)
                      .forEach(order => {
                        order.waste_data.forEach(waste => {
                          const category = waste.item_type || 'Unknown';
                          wasteByCategory[category] = (wasteByCategory[category] || 0) + (waste.weight || 0);
                        });
                      });
                    
                    return Object.entries(wasteByCategory).map(([category, weight]) => {
                      const percentage = Object.values(wasteByCategory).reduce((sum, w) => sum + w, 0) > 0 ?
                        Math.round((weight / Object.values(wasteByCategory).reduce((sum, w) => sum + w, 0)) * 100) : 0;
                      
                      return (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">{category}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="h-2 rounded-full bg-red-500" style={{ width: `${percentage}%` }}></div>
                            </div>
                            <span className="text-sm text-gray-500 w-16">{weight.toFixed(2)}kg</span>
                          </div>
                        </div>
                      );
                    });
                  })()
                  }
                </div>
              </Card>
              
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">High-Waste Orders</h3>
                    <p className="text-sm text-gray-600">Orders with highest waste generation</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {analytics.orders
                    .filter(o => o.status === 'completed' && o.waste_data && o.waste_data.length > 0)
                    .sort((a, b) => {
                      const aWaste = a.waste_data.reduce((sum, w) => sum + (w.weight || 0), 0);
                      const bWaste = b.waste_data.reduce((sum, w) => sum + (w.weight || 0), 0);
                      return bWaste - aWaste;
                    })
                    .slice(0, 5)
                    .length > 0 ? (
                    analytics.orders
                      .filter(o => o.status === 'completed' && o.waste_data && o.waste_data.length > 0)
                      .sort((a, b) => {
                        const aWaste = a.waste_data.reduce((sum, w) => sum + (w.weight || 0), 0);
                        const bWaste = b.waste_data.reduce((sum, w) => sum + (w.weight || 0), 0);
                        return bWaste - aWaste;
                      })
                      .slice(0, 5)
                      .map((order, index) => {
                        const totalWaste = order.waste_data.reduce((sum, w) => sum + (w.weight || 0), 0);
                        const wasteTypes = [...new Set(order.waste_data.map(w => w.item_type))];
                        
                        return (
                          <div key={order.id} className="group p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all duration-200 cursor-pointer"
                               onClick={() => viewWasteReport(order)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-full text-white font-bold text-sm">
                                  #{index + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 group-hover:text-red-800">{order.order_number}</p>
                                  <p className="text-sm text-gray-600">{order.product_name}</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {wasteTypes.slice(0, 2).map(type => (
                                      <Badge key={type} variant="warning" size="xs">{type}</Badge>
                                    ))}
                                    {wasteTypes.length > 2 && (
                                      <Badge variant="warning" size="xs">+{wasteTypes.length - 2} more</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                  <span className="text-lg font-bold text-red-600">{totalWaste.toFixed(2)} kg</span>
                                </div>
                                <div className="text-xs text-gray-500">{order.waste_data.length} waste items</div>
                                <div className="text-xs text-red-600 font-medium">Click to view details</div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                      <p className="text-gray-600">No high-waste orders found</p>
                      <p className="text-sm text-gray-500">All completed orders have minimal waste generation</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Waste Report View Modal */}
      {selectedWasteReport && (
        <Modal title="Waste Report Details" onClose={() => setSelectedWasteReport(null)} size="lg">
          <div className="space-y-6">
            {/* Order Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900">{selectedWasteReport.order.order_number}</h3>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <p className="text-gray-600">Product: <span className="font-medium">{selectedWasteReport.order.product_name}</span></p>
                  <p className="text-gray-600">Completed: <span className="font-medium">
                    {selectedWasteReport.order.complete_time ? Time.formatSASTDateTime(selectedWasteReport.order.complete_time) : 'N/A'}
                  </span></p>
                </div>
                <div>
                  <p className="text-gray-600">Quantity: <span className="font-medium">{selectedWasteReport.order.actual_quantity || selectedWasteReport.order.quantity} units</span></p>
                  <p className="text-gray-600">Target: <span className="font-medium">{selectedWasteReport.order.quantity} units</span></p>
                </div>
              </div>
            </div>
            
            {/* Waste Summary */}
            {selectedWasteReport.wasteData.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{selectedWasteReport.metrics.totalWeight.toFixed(2)}</p>
                    <p className="text-sm text-red-700">Total Weight (kg)</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{selectedWasteReport.metrics.itemCount}</p>
                    <p className="text-sm text-yellow-700">Waste Items</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{selectedWasteReport.metrics.categories.length}</p>
                    <p className="text-sm text-blue-700">Categories</p>
                  </div>
                </div>
                
                {/* Waste Items Detail */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Waste Items Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedWasteReport.wasteData.map((waste, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              <Badge variant="warning" size="sm">{waste.item_type}</Badge>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">{waste.description || 'No description'}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{waste.weight || 0}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{waste.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Waste Recorded</h3>
                <p className="text-gray-600">This order was completed without recorded waste.</p>
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setSelectedWasteReport(null)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}