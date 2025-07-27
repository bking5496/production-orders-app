// analytics.js - Analytics and Reporting Component
// Save as: public/js/components/analytics.js

window.AnalyticsPage = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, selectedEnvironment]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: dateRange.start,
        end_date: dateRange.end
      };
      if (selectedEnvironment !== 'all') {
        params.environment = selectedEnvironment;
      }

      // Fetch analytics data
      const [orders, machines, stops] = await Promise.all([
        API.getOrders(params),
        API.getMachines(),
        API.get('/analytics/stops', params)
      ]);

      // Calculate metrics
      const metrics = calculateMetrics(orders, machines, stops);
      setAnalytics(metrics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (orders, machines, stops) => {
    // Overall metrics
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
    const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0);
    const completedQuantity = orders.reduce((sum, o) => sum + o.completed_quantity, 0);

    // Efficiency metrics
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const productionEfficiency = totalQuantity > 0 ? (completedQuantity / totalQuantity) * 100 : 0;

    // Machine utilization
    const machineUtilization = machines.map(machine => {
      const machineOrders = orders.filter(o => o.machine_id === machine.id);
      const utilizationRate = machineOrders.length > 0 ? 
        (machineOrders.filter(o => o.status === 'in_progress').length / machineOrders.length) * 100 : 0;
      
      return {
        ...machine,
        orderCount: machineOrders.length,
        utilizationRate
      };
    });

    // Production by day
    const productionByDay = {};
    orders.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString();
      if (!productionByDay[date]) {
        productionByDay[date] = { total: 0, completed: 0 };
      }
      productionByDay[date].total += order.quantity;
      productionByDay[date].completed += order.completed_quantity;
    });

    // Priority distribution
    const priorityDistribution = {
      low: orders.filter(o => o.priority === 'low').length,
      normal: orders.filter(o => o.priority === 'normal').length,
      high: orders.filter(o => o.priority === 'high').length,
      urgent: orders.filter(o => o.priority === 'urgent').length
    };

    return {
      summary: {
        totalOrders,
        completedOrders,
        inProgressOrders,
        totalQuantity,
        completedQuantity,
        completionRate,
        productionEfficiency
      },
      machineUtilization,
      productionByDay,
      priorityDistribution,
      downtime: stops || []
    };
  };

  const exportReport = async (format) => {
    try {
      const response = await API.get(`/export/analytics`, {
        format,
        ...dateRange,
        environment: selectedEnvironment
      });
      
      // Handle file download
      const blob = new Blob([response], { type: format === 'csv' ? 'text/csv' : 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${dateRange.start}-${dateRange.end}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) {
    return React.createElement('div', {
      className: 'flex justify-center items-center h-64'
    },
      React.createElement(LoadingSpinner, { size: 48 })
    );
  }

  return React.createElement('div', { className: 'space-y-6' },
    // Header with filters
    React.createElement(PageHeader, {
      title: 'Analytics & Reports',
      subtitle: 'Production performance metrics and insights',
      actions: React.createElement('div', { className: 'flex space-x-3' },
        React.createElement(Button, {
          variant: 'secondary',
          icon: React.createElement(Icon, { icon: ICONS.Download, size: 16 }),
          onClick: () => exportReport('csv')
        }, 'Export CSV'),
        React.createElement(Button, {
          variant: 'secondary',
          icon: React.createElement(Icon, { icon: ICONS.Download, size: 16 }),
          onClick: () => exportReport('pdf')
        }, 'Export PDF')
      )
    }),

    // Filters
    React.createElement(ContentCard, {},
      React.createElement('div', {
        className: 'grid grid-cols-1 md:grid-cols-3 gap-4'
      },
        React.createElement(Input, {
          type: 'date',
          label: 'Start Date',
          value: dateRange.start,
          onChange: (e) => setDateRange(prev => ({ ...prev, start: e.target.value }))
        }),
        React.createElement(Input, {
          type: 'date',
          label: 'End Date',
          value: dateRange.end,
          onChange: (e) => setDateRange(prev => ({ ...prev, end: e.target.value }))
        }),
        React.createElement(Select, {
          label: 'Environment',
          value: selectedEnvironment,
          onChange: (e) => setSelectedEnvironment(e.target.value),
          options: [
            { value: 'all', label: 'All Environments' },
            { value: 'production', label: 'Production' },
            { value: 'testing', label: 'Testing' }
          ]
        })
      )
    ),

    // Summary Cards
    React.createElement('div', {
      className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
    },
      React.createElement(StatsCard, {
        title: 'Total Orders',
        value: analytics?.summary.totalOrders || 0,
        icon: ICONS.Package,
        color: 'blue'
      }),
      React.createElement(StatsCard, {
        title: 'Completion Rate',
        value: `${Math.round(analytics?.summary.completionRate || 0)}%`,
        icon: ICONS.CheckCircle,
        color: 'green'
      }),
      React.createElement(StatsCard, {
        title: 'In Progress',
        value: analytics?.summary.inProgressOrders || 0,
        icon: ICONS.Clock,
        color: 'yellow'
      }),
      React.createElement(StatsCard, {
        title: 'Production Efficiency',
        value: `${Math.round(analytics?.summary.productionEfficiency || 0)}%`,
        icon: ICONS.TrendingUp,
        color: 'purple'
      })
    ),

    // Charts Section
    React.createElement('div', {
      className: 'grid grid-cols-1 lg:grid-cols-2 gap-6'
    },
      // Production Trend Chart
      React.createElement(ContentCard, {
        title: 'Production Trend'
      },
        React.createElement(ProductionChart, {
          data: analytics?.productionByDay || {}
        })
      ),

      // Priority Distribution
      React.createElement(ContentCard, {
        title: 'Order Priority Distribution'
      },
        React.createElement(PriorityChart, {
          data: analytics?.priorityDistribution || {}
        })
      )
    ),

    // Machine Utilization Table
    React.createElement(ContentCard, {
      title: 'Machine Utilization'
    },
      React.createElement(Table, {
        columns: [
          { key: 'name', label: 'Machine' },
          { key: 'environment', label: 'Environment' },
          { key: 'status', label: 'Status', render: (status) => 
            React.createElement(Badge, {
              variant: status === 'available' ? 'success' : 'warning'
            }, status)
          },
          { key: 'orderCount', label: 'Orders' },
          { key: 'utilizationRate', label: 'Utilization', render: (rate) => 
            React.createElement(ProgressBar, {
              value: rate,
              max: 100,
              color: rate > 80 ? 'green' : rate > 50 ? 'yellow' : 'red',
              showLabel: false
            })
          }
        ],
        data: analytics?.machineUtilization || []
      })
    )
  );
};

// Production Chart Component
const ProductionChart = ({ data }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const ctx = canvasRef.current.getContext('2d');
    const dates = Object.keys(data).slice(-7); // Last 7 days
    const values = dates.map(date => data[date]);

    // Simple line chart rendering
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw data
    if (values.length > 0) {
      const maxValue = Math.max(...values.map(v => v.total));
      const xStep = chartWidth / (values.length - 1);
      const yScale = chartHeight / maxValue;

      // Draw line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      values.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = height - padding - (value.total * yScale);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw points
      ctx.fillStyle = '#3b82f6';
      values.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = height - padding - (value.total * yScale);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [data]);

  return React.createElement('canvas', {
    ref: canvasRef,
    width: 500,
    height: 300,
    className: 'w-full'
  });
};

// Priority Chart Component
const PriorityChart = ({ data }) => {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const colors = {
    low: '#6b7280',
    normal: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444'
  };

  return React.createElement('div', { className: 'space-y-4' },
    Object.entries(data).map(([priority, count]) => {
      const percentage = total > 0 ? (count / total) * 100 : 0;
      
      return React.createElement('div', {
        key: priority,
        className: 'space-y-2'
      },
        React.createElement('div', {
          className: 'flex justify-between text-sm'
        },
          React.createElement('span', {
            className: 'font-medium capitalize'
          }, priority),
          React.createElement('span', {
            className: 'text-gray-500'
          }, `${count} (${Math.round(percentage)}%)`)
        ),
        React.createElement('div', {
          className: 'w-full bg-gray-200 rounded-full h-2'
        },
          React.createElement('div', {
            className: 'h-2 rounded-full transition-all duration-300',
            style: {
              width: `${percentage}%`,
              backgroundColor: colors[priority]
            }
          })
        )
      );
    })
  );
};
