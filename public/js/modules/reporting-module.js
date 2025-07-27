// reporting-module.js - Reporting and Export Module
// Save as: public/js/modules/reporting-module.js

window.loadModule('reporting-module', ['api', 'file-utils'], () => {
  
  // Report Generator Component
  window.ReportGenerator = ({ type, filters }) => {
    const [generating, setGenerating] = useState(false);
    const [schedule, setSchedule] = useState('manual');
    const [recipients, setRecipients] = useState('');

    const reportTypes = [
      { value: 'production', label: 'Production Report', icon: ICONS.Package },
      { value: 'downtime', label: 'Downtime Analysis', icon: ICONS.Clock },
      { value: 'efficiency', label: 'Efficiency Report', icon: ICONS.TrendingUp },
      { value: 'inventory', label: 'Inventory Status', icon: ICONS.BarChart3 }
    ];

    const scheduleOptions = [
      { value: 'manual', label: 'Manual' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const generateReport = async (format = 'pdf') => {
      setGenerating(true);
      try {
        const response = await API.post('/reports/generate', {
          type,
          format,
          filters,
          schedule,
          recipients: recipients.split(',').map(e => e.trim()).filter(Boolean)
        });

        if (response.url) {
          window.open(response.url, '_blank');
        } else if (response.data) {
          FileUtils.export[format](response.data, `${type}-report`);
        }
      } catch (error) {
        console.error('Report generation failed:', error);
      } finally {
        setGenerating(false);
      }
    };

    return React.createElement('div', {
      className: 'bg-white rounded-lg shadow p-6'
    },
      React.createElement('h3', {
        className: 'text-lg font-semibold mb-4'
      }, 'Generate Report'),

      React.createElement('div', {
        className: 'space-y-4'
      },
        // Report Type Selection
        React.createElement('div', {
          className: 'grid grid-cols-2 gap-3'
        },
          reportTypes.map(report =>
            React.createElement('button', {
              key: report.value,
              onClick: () => type = report.value,
              className: `p-4 border rounded-lg text-left hover:bg-gray-50 ${
                type === report.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`
            },
              React.createElement('div', {
                className: 'flex items-center space-x-3'
              },
                React.createElement(Icon, {
                  icon: report.icon,
                  size: 20,
                  className: type === report.value ? 'text-blue-600' : 'text-gray-400'
                }),
                React.createElement('span', {
                  className: `font-medium ${type === report.value ? 'text-blue-600' : 'text-gray-700'}`
                }, report.label)
              )
            )
          )
        ),

        // Schedule Settings
        React.createElement(Select, {
          label: 'Schedule',
          value: schedule,
          onChange: (e) => setSchedule(e.target.value),
          options: scheduleOptions
        }),

        // Recipients (for scheduled reports)
        schedule !== 'manual' && React.createElement(Input, {
          label: 'Email Recipients',
          placeholder: 'email1@example.com, email2@example.com',
          value: recipients,
          onChange: (e) => setRecipients(e.target.value)
        }),

        // Generate Buttons
        React.createElement('div', {
          className: 'flex space-x-3 pt-4'
        },
          React.createElement(Button, {
            onClick: () => generateReport('pdf'),
            loading: generating,
            icon: React.createElement(Icon, { icon: ICONS.Download, size: 16 })
          }, 'Generate PDF'),
          React.createElement(Button, {
            variant: 'secondary',
            onClick: () => generateReport('excel'),
            loading: generating,
            icon: React.createElement(Icon, { icon: ICONS.Download, size: 16 })
          }, 'Generate Excel')
        )
      )
    );
  };

  // Custom Report Builder
  window.CustomReportBuilder = () => {
    const [selectedMetrics, setSelectedMetrics] = useState([]);
    const [groupBy, setGroupBy] = useState('day');
    const [chartType, setChartType] = useState('line');

    const availableMetrics = [
      { id: 'orders_count', label: 'Order Count', category: 'Orders' },
      { id: 'orders_completed', label: 'Completed Orders', category: 'Orders' },
      { id: 'production_quantity', label: 'Production Quantity', category: 'Production' },
      { id: 'machine_utilization', label: 'Machine Utilization', category: 'Machines' },
      { id: 'downtime_duration', label: 'Downtime Duration', category: 'Efficiency' },
      { id: 'efficiency_rate', label: 'Efficiency Rate', category: 'Efficiency' }
    ];

    const toggleMetric = (metricId) => {
      setSelectedMetrics(prev =>
        prev.includes(metricId)
          ? prev.filter(id => id !== metricId)
          : [...prev, metricId]
      );
    };

    return React.createElement(ContentCard, {
      title: 'Custom Report Builder',
      subtitle: 'Build custom reports with your selected metrics'
    },
      React.createElement('div', {
        className: 'space-y-6'
      },
        // Metric Selection
        React.createElement('div', {},
          React.createElement('h4', {
            className: 'font-medium mb-3'
          }, 'Select Metrics'),
          React.createElement('div', {
            className: 'grid grid-cols-2 md:grid-cols-3 gap-3'
          },
            availableMetrics.map(metric =>
              React.createElement('label', {
                key: metric.id,
                className: 'flex items-center space-x-2 cursor-pointer'
              },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: selectedMetrics.includes(metric.id),
                  onChange: () => toggleMetric(metric.id),
                  className: 'rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                }),
                React.createElement('span', {
                  className: 'text-sm'
                }, metric.label)
              )
            )
          )
        ),

        // Grouping Options
        React.createElement('div', {
          className: 'grid grid-cols-2 gap-4'
        },
          React.createElement(Select, {
            label: 'Group By',
            value: groupBy,
            onChange: (e) => setGroupBy(e.target.value),
            options: [
              { value: 'hour', label: 'Hour' },
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'environment', label: 'Environment' },
              { value: 'machine', label: 'Machine' }
            ]
          }),
          React.createElement(Select, {
            label: 'Chart Type',
            value: chartType,
            onChange: (e) => setChartType(e.target.value),
            options: [
              { value: 'line', label: 'Line Chart' },
              { value: 'bar', label: 'Bar Chart' },
              { value: 'pie', label: 'Pie Chart' },
              { value: 'table', label: 'Table' }
            ]
          })
        ),

        // Preview Button
        React.createElement('div', {
          className: 'pt-4'
        },
          React.createElement(Button, {
            variant: 'primary',
            disabled: selectedMetrics.length === 0
          }, 'Preview Report')
        )
      )
    );
  };

  // Report Template Manager
  window.ReportTemplateManager = () => {
    const [templates, setTemplates] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
      loadTemplates();
    }, []);

    const loadTemplates = async () => {
      try {
        const data = await API.get('/reports/templates');
        setTemplates(data);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };

    const deleteTemplate = async (id) => {
      if (window.confirm('Delete this template?')) {
        try {
          await API.delete(`/reports/templates/${id}`);
          loadTemplates();
        } catch (error) {
          console.error('Failed to delete template:', error);
        }
      }
    };

    return React.createElement('div', {
      className: 'space-y-4'
    },
      React.createElement('div', {
        className: 'flex justify-between items-center'
      },
        React.createElement('h3', {
          className: 'text-lg font-semibold'
        }, 'Report Templates'),
        React.createElement(Button, {
          size: 'sm',
          onClick: () => setShowCreateModal(true),
          icon: React.createElement(Icon, { icon: ICONS.Plus, size: 16 })
        }, 'Create Template')
      ),

      React.createElement('div', {
        className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      },
        templates.map(template =>
          React.createElement('div', {
            key: template.id,
            className: 'border rounded-lg p-4 hover:shadow-lg transition-shadow'
          },
            React.createElement('div', {
              className: 'flex justify-between items-start mb-2'
            },
              React.createElement('h4', {
                className: 'font-medium'
              }, template.name),
              React.createElement(Dropdown, {
                trigger: React.createElement(Icon, {
                  icon: ICONS.MoreVertical,
                  size: 16,
                  className: 'text-gray-400 cursor-pointer'
                }),
                items: [
                  { label: 'Edit', onClick: () => {} },
                  { label: 'Duplicate', onClick: () => {} },
                  { divider: true },
                  { label: 'Delete', onClick: () => deleteTemplate(template.id) }
                ]
              })
            ),
            React.createElement('p', {
              className: 'text-sm text-gray-600 mb-3'
            }, template.description),
            React.createElement('div', {
              className: 'flex items-center justify-between text-xs text-gray-500'
            },
              React.createElement('span', {}, `Type: ${template.type}`),
              React.createElement('span', {}, `Last used: ${Utils.formatDate(template.last_used)}`)
            )
          )
        )
      )
    );
  };

  // Export Queue Monitor
  window.ExportQueueMonitor = () => {
    const [queue, setQueue] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);

    useEffect(() => {
      // Connect to WebSocket for real-time updates
      const ws = new WebSocket(APP_CONFIG.WS_URL);
      
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'export_update') {
          setQueue(data.queue);
        }
      };

      loadQueue();

      return () => ws.close();
    }, []);

    const loadQueue = async () => {
      try {
        const data = await API.get('/exports/queue');
        setQueue(data);
      } catch (error) {
        console.error('Failed to load export queue:', error);
      }
    };

    const cancelExport = async (id) => {
      try {
        await API.post(`/exports/${id}/cancel`);
        loadQueue();
      } catch (error) {
        console.error('Failed to cancel export:', error);
      }
    };

    if (queue.length === 0) {
      return null;
    }

    return React.createElement('div', {
      className: 'bg-white rounded-lg shadow p-4'
    },
      React.createElement('div', {
        className: 'flex items-center justify-between mb-3'
      },
        React.createElement('h4', {
          className: 'font-medium'
        }, 'Export Queue'),
        React.createElement('div', {
          className: `w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`
        })
      ),

      React.createElement('div', {
        className: 'space-y-2'
      },
        queue.map(job =>
          React.createElement('div', {
            key: job.id,
            className: 'flex items-center justify-between p-2 bg-gray-50 rounded'
          },
            React.createElement('div', {
              className: 'flex-1'
            },
              React.createElement('div', {
                className: 'text-sm font-medium'
              }, job.name),
              React.createElement('div', {
                className: 'text-xs text-gray-500'
              }, `Status: ${job.status} - ${job.progress}%`)
            ),
            React.createElement('div', {
              className: 'flex items-center space-x-2'
            },
              job.status === 'processing' && React.createElement(LoadingSpinner, { size: 16 }),
              job.status === 'pending' && React.createElement('button', {
                onClick: () => cancelExport(job.id),
                className: 'text-red-600 hover:text-red-700'
              },
                React.createElement(Icon, { icon: ICONS.X, size: 16 })
              )
            )
          )
        )
      )
    );
  };

  return {
    ReportGenerator,
    CustomReportBuilder,
    ReportTemplateManager,
    ExportQueueMonitor
  };
});
