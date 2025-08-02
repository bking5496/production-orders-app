// Configuration Manager Component
// Admin interface for managing all configurable lists and processes

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  History, 
  Eye, 
  Edit3, 
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Search
} from 'lucide-react';
import { useWebSocketEvent } from '../core/websocket-hooks.js';
import API from '../core/api.js';

export default function ConfigurationManager() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [configItems, setConfigItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [itemHistory, setItemHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [notification, setNotification] = useState(null);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load items when category changes
  useEffect(() => {
    if (selectedCategory) {
      loadCategoryItems(selectedCategory.id);
    }
  }, [selectedCategory]);

  // Listen for real-time configuration updates
  useWebSocketEvent('configuration_updated', (data) => {
    setNotification({
      type: data.requires_restart ? 'warning' : 'success',
      message: `Configuration "${data.key}" was updated by ${data.updated_by}${data.requires_restart ? ' (restart required)' : ''}`,
      timestamp: new Date()
    });
    
    // Reload current category if it matches
    if (selectedCategory && selectedCategory.id === data.category) {
      loadCategoryItems(selectedCategory.id);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await API.get('/config/categories');
      setCategories(response);
      if (response.length > 0 && !selectedCategory) {
        setSelectedCategory(response[0]);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load configuration categories',
        timestamp: new Date()
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryItems = async (categoryId) => {
    try {
      const response = await API.get(`/config/categories/${categoryId}/items`);
      setConfigItems(response);
      setSelectedItem(null);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to load category items:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load configuration items',
        timestamp: new Date()
      });
    }
  };

  const loadItemHistory = async (itemId) => {
    try {
      const response = await API.get(`/config/items/${itemId}/history`);
      setItemHistory(response);
      setShowHistory(true);
    } catch (error) {
      console.error('Failed to load item history:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load configuration history',
        timestamp: new Date()
      });
    }
  };

  const saveConfiguration = async (item, newValue, changeReason) => {
    try {
      setSaving(true);
      await API.put(`/config/items/${item.id}`, {
        current_value: newValue,
        change_reason: changeReason
      });

      setNotification({
        type: 'success',
        message: `Configuration "${item.display_name}" updated successfully`,
        timestamp: new Date()
      });

      // Reload items
      await loadCategoryItems(selectedCategory.id);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to save configuration',
        timestamp: new Date()
      });
    } finally {
      setSaving(false);
    }
  };

  const exportConfigurations = async () => {
    try {
      const response = await API.get('/config/export');
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `configuration-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setNotification({
        type: 'success',
        message: 'Configuration exported successfully',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to export configurations:', error);
      setNotification({
        type: 'error',
        message: 'Failed to export configurations',
        timestamp: new Date()
      });
    }
  };

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return configItems;
    return configItems.filter(item =>
      item.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.key.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [configItems, searchTerm]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Configuration Manager</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportConfigurations}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
        
        {/* Notification */}
        {notification && (
          <div className={`mt-4 p-3 rounded-lg flex items-center space-x-2 ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' :
            notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> :
             notification.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
             <AlertTriangle className="h-4 w-4" />}
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex">
        {/* Categories Sidebar */}
        <div className="w-1/4 bg-white border-r p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Categories</h2>
          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedCategory?.id === category.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="font-medium">{category.display_name}</div>
                <div className="text-sm text-gray-500">{category.item_count} items</div>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration Items */}
        <div className="flex-1 p-6">
          {selectedCategory && (
            <>
              {/* Search and Filters */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search configurations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Configuration Items List */}
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <ConfigurationItem
                    key={item.id}
                    item={item}
                    isEditing={editingItem?.id === item.id}
                    onEdit={() => setEditingItem(item)}
                    onSave={(newValue, reason) => saveConfiguration(item, newValue, reason)}
                    onCancel={() => setEditingItem(null)}
                    onViewHistory={() => loadItemHistory(item.id)}
                    saving={saving}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <HistoryModal
          history={itemHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

// Configuration Item Component
function ConfigurationItem({ item, isEditing, onEdit, onSave, onCancel, onViewHistory, saving }) {
  const [editValue, setEditValue] = useState(item.current_value);
  const [changeReason, setChangeReason] = useState('');

  useEffect(() => {
    if (isEditing) {
      setEditValue(item.current_value);
      setChangeReason('');
    }
  }, [isEditing, item.current_value]);

  const handleSave = () => {
    onSave(editValue, changeReason);
  };

  const renderValueEditor = () => {
    switch (item.value_type) {
      case 'string':
        return (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded"
          />
        );
      
      case 'boolean':
        return (
          <select
            value={editValue.toString()}
            onChange={(e) => setEditValue(e.target.value === 'true')}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );
      
      case 'array':
      case 'object':
      case 'json':
        return (
          <textarea
            rows={6}
            value={JSON.stringify(editValue, null, 2)}
            onChange={(e) => {
              try {
                setEditValue(JSON.parse(e.target.value));
              } catch (err) {
                // Keep the string value for now, validation will catch it
                setEditValue(e.target.value);
              }
            }}
            className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={JSON.stringify(editValue)}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        );
    }
  };

  const renderValueDisplay = () => {
    switch (item.value_type) {
      case 'array':
      case 'object':
      case 'json':
        return (
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {JSON.stringify(item.current_value, null, 2)}
          </pre>
        );
      
      case 'boolean':
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-sm ${
            item.current_value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {item.current_value ? 'True' : 'False'}
          </span>
        );
      
      default:
        return <span className="text-gray-900">{String(item.current_value)}</span>;
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{item.display_name}</h3>
          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
          <div className="flex items-center space-x-4 mt-2">
            <span className="text-xs text-gray-400">Key: {item.key}</span>
            <span className="text-xs text-gray-400">Type: {item.value_type}</span>
            {item.requires_restart && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Requires Restart
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onViewHistory}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="View History"
          >
            <History className="h-4 w-4" />
          </button>
          {item.is_editable && (
            <button
              onClick={isEditing ? onCancel : onEdit}
              className="p-2 text-gray-400 hover:text-gray-600"
              title={isEditing ? "Cancel" : "Edit"}
            >
              {isEditing ? "Cancel" : <Edit3 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Value
          </label>
          {isEditing ? renderValueEditor() : renderValueDisplay()}
        </div>

        {isEditing && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Change Reason (Optional)
              </label>
              <input
                type="text"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Describe why this change is being made..."
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// History Modal Component
function HistoryModal({ history, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Configuration History</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-96">
          <div className="space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Changed by {entry.changed_by_username}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                  {entry.change_reason && (
                    <div className="text-sm text-gray-600 italic">
                      "{entry.change_reason}"
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-700">Previous Value:</div>
                    <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(entry.old_value, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">New Value:</div>
                    <pre className="bg-green-50 p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(entry.new_value, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}