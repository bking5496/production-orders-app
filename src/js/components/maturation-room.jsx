import React, { useState, useEffect } from 'react';
import { Package, Calendar, Thermometer, Droplets, CheckCircle2, Clock, AlertTriangle, Eye, Plus, Search, Download } from 'lucide-react';
import API from '../core/api';
import { useAuth } from '../core/auth';
import { Modal, Button } from './ui-components.jsx';
import { formatUserDisplayName } from '../utils/text-utils';

export default function MaturationRoom() {
    const { user: currentUser } = useAuth();
    const [maturationData, setMaturationData] = useState([]);
    const [completedOrders, setCompletedOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCheckModal, setShowCheckModal] = useState(false);
    const [selectedBlend, setSelectedBlend] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    
    const [formData, setFormData] = useState({
        production_order_id: '',
        blend_name: '',
        batch_number: '',
        quantity_produced: '',
        quantity_expected: '',
        unit_of_measurement: 'kg',
        maturation_date: new Date().toISOString().split('T')[0],
        expected_maturation_days: 30,
        storage_location: '',
        temperature: '',
        humidity: '',
        notes: ''
    });

    const [dailyCheckData, setDailyCheckData] = useState({
        temperature: '',
        humidity: '',
        visual_condition: 'Good',
        notes: ''
    });

    const maturationStatuses = [
        { value: 'maturing', label: 'Maturing', color: 'blue', icon: Clock },
        { value: 'ready', label: 'Ready', color: 'green', icon: CheckCircle2 },
        { value: 'completed', label: 'Completed', color: 'purple', icon: Package },
        { value: 'quality_check', label: 'Quality Check', color: 'yellow', icon: Eye },
        { value: 'rejected', label: 'Rejected', color: 'red', icon: AlertTriangle }
    ];

    const visualConditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Concerning'];

    useEffect(() => {
        loadMaturationData();
        loadCompletedOrders();
    }, []);

    const loadMaturationData = async () => {
        setLoading(true);
        try {
            const response = await API.get('/maturation-room');
            setMaturationData(response.data || response);
        } catch (error) {
            console.error('Failed to load maturation data:', error);
            setMaturationData([]);
        } finally {
            setLoading(false);
        }
    };

    const loadCompletedOrders = async () => {
        try {
            const response = await API.get('/orders?status=completed');
            const ordersWithoutMaturation = response.filter(order => 
                !maturationData.some(mat => mat.production_order_id === order.id)
            );
            setCompletedOrders(ordersWithoutMaturation);
        } catch (error) {
            console.error('Failed to load completed orders:', error);
        }
    };

    const addToMaturation = async (e) => {
        e.preventDefault();
        try {
            const maturationRecord = {
                ...formData,
                quantity_produced: parseFloat(formData.quantity_produced),
                quantity_expected: parseFloat(formData.quantity_expected),
                temperature: formData.temperature ? parseFloat(formData.temperature) : null,
                humidity: formData.humidity ? parseFloat(formData.humidity) : null,
                confirmed_by: currentUser.id
            };

            await API.post('/maturation-room', maturationRecord);
            setShowAddModal(false);
            resetForm();
            loadMaturationData();
            loadCompletedOrders();
        } catch (error) {
            console.error('Failed to add to maturation:', error);
            alert('Failed to add blend to maturation: ' + (error.response?.data?.message || error.message));
        }
    };

    const addDailyCheck = async (e) => {
        e.preventDefault();
        try {
            const checkRecord = {
                maturation_room_id: selectedBlend.id,
                check_date: new Date().toISOString().split('T')[0],
                temperature: dailyCheckData.temperature ? parseFloat(dailyCheckData.temperature) : null,
                humidity: dailyCheckData.humidity ? parseFloat(dailyCheckData.humidity) : null,
                visual_condition: dailyCheckData.visual_condition,
                notes: dailyCheckData.notes,
                checked_by: currentUser.id
            };

            await API.post('/maturation-room/daily-check', checkRecord);
            setShowCheckModal(false);
            setSelectedBlend(null);
            resetDailyCheckData();
            loadMaturationData();
        } catch (error) {
            console.error('Failed to add daily check:', error);
            alert('Failed to add daily check: ' + (error.response?.data?.message || error.message));
        }
    };

    const updateStatus = async (blendId, newStatus) => {
        try {
            await API.put(`/maturation-room/${blendId}/status`, { 
                status: newStatus,
                quality_checked: newStatus === 'ready',
                quality_check_date: newStatus === 'ready' ? new Date().toISOString().split('T')[0] : null,
                quality_checked_by: newStatus === 'ready' ? currentUser.id : null
            });
            loadMaturationData();
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update status: ' + (error.response?.data?.message || error.message));
        }
    };

    const resetForm = () => {
        setFormData({
            production_order_id: '',
            blend_name: '',
            batch_number: '',
            quantity_produced: '',
            quantity_expected: '',
            unit_of_measurement: 'kg',
            maturation_date: new Date().toISOString().split('T')[0],
            expected_maturation_days: 30,
            storage_location: '',
            temperature: '',
            humidity: '',
            notes: ''
        });
    };

    const resetDailyCheckData = () => {
        setDailyCheckData({
            temperature: '',
            humidity: '',
            visual_condition: 'Good',
            notes: ''
        });
    };

    const getStatusBadge = (status) => {
        const statusConfig = maturationStatuses.find(s => s.value === status) || maturationStatuses[0];
        const IconComponent = statusConfig.icon;
        
        return (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-${statusConfig.color}-100 text-${statusConfig.color}-800`}>
                <IconComponent className="w-4 h-4 mr-1" />
                {statusConfig.label}
            </div>
        );
    };

    const getDaysInMaturation = (maturationDate) => {
        const startDate = new Date(maturationDate);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getVarianceColor = (variance) => {
        if (Math.abs(variance) < 5) return 'text-green-600';
        if (Math.abs(variance) < 15) return 'text-yellow-600';
        return 'text-red-600';
    };

    const filterMaturationData = () => {
        let filtered = maturationData;
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(item => item.status === statusFilter);
        }
        
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                item.blend_name?.toLowerCase().includes(searchLower) ||
                item.batch_number?.toLowerCase().includes(searchLower) ||
                item.storage_location?.toLowerCase().includes(searchLower)
            );
        }
        
        return filtered;
    };

    const exportMaturationData = () => {
        const csvContent = [
            ['Blend Name', 'Batch Number', 'Status', 'Qty Produced', 'Qty Expected', 'Variance %', 'Maturation Date', 'Days Maturing', 'Expected Ready', 'Storage Location', 'Temperature', 'Humidity'].join(','),
            ...filterMaturationData().map(item => [
                item.blend_name,
                item.batch_number,
                item.status,
                item.quantity_produced,
                item.quantity_expected,
                item.variance_percentage?.toFixed(2) || '0.00',
                item.maturation_date,
                getDaysInMaturation(item.maturation_date),
                item.estimated_completion_date,
                item.storage_location || 'N/A',
                item.temperature || 'N/A',
                item.humidity || 'N/A'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `maturation-room-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const filteredData = filterMaturationData();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-purple-200 text-sm mb-2">
                                <span className="cursor-pointer hover:text-white transition-colors">Daily Operations</span>
                                <span>&gt;</span>
                                <span className="text-white font-medium">Maturation Room</span>
                                <span className="ml-2 px-2 py-1 bg-green-500 bg-opacity-20 text-green-200 rounded-full text-xs">Live</span>
                            </div>
                            <h1 className="text-2xl font-bold flex items-center gap-3">
                                <Package className="w-8 h-8" />
                                Maturation Room
                            </h1>
                            <p className="text-purple-100 mt-1">Track and confirm blending quantities during maturation</p>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add to Maturation
                        </button>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-purple-300" />
                            <input
                                type="text"
                                placeholder="Search blends..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-white bg-opacity-10 text-white placeholder-purple-200 pl-10 pr-4 py-2 rounded-lg border border-white border-opacity-20 focus:border-opacity-40 focus:bg-opacity-20"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-white bg-opacity-10 text-white rounded-lg px-3 py-2 text-sm font-medium"
                        >
                            <option value="all" className="text-black">All Status</option>
                            {maturationStatuses.map(status => (
                                <option key={status.value} value={status.value} className="text-black">
                                    {status.label}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={exportMaturationData}
                            className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    {maturationStatuses.slice(0, 4).map(status => {
                        const count = maturationData.filter(item => item.status === status.value).length;
                        const IconComponent = status.icon;
                        return (
                            <div key={status.value} className={`bg-white rounded-xl shadow-sm border border-${status.color}-100 p-6`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`text-sm font-medium text-${status.color}-600`}>{status.label}</p>
                                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                                    </div>
                                    <div className={`bg-${status.color}-100 p-3 rounded-full`}>
                                        <IconComponent className={`w-6 h-6 text-${status.color}-600`} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Maturation Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                                <p className="text-gray-500 mt-3">Loading maturation data...</p>
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">No blends in maturation</p>
                                <p className="text-sm text-gray-400">Add completed blends to start tracking maturation</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blend</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Number</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantities</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Maturing</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conditions</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredData.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{item.blend_name}</div>
                                                    <div className="text-sm text-gray-500">{item.storage_location}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-mono text-gray-900">{item.batch_number}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(item.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {item.quantity_produced} / {item.quantity_expected} {item.unit_of_measurement}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className={`text-sm font-medium ${getVarianceColor(item.variance_percentage || 0)}`}>
                                                        {item.variance_percentage ? `${item.variance_percentage.toFixed(1)}%` : '0.0%'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {getDaysInMaturation(item.maturation_date)} days
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Target: {item.expected_maturation_days} days
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                                        {item.temperature && (
                                                            <span className="flex items-center gap-1">
                                                                <Thermometer className="w-4 h-4" />
                                                                {item.temperature}°C
                                                            </span>
                                                        )}
                                                        {item.humidity && (
                                                            <span className="flex items-center gap-1">
                                                                <Droplets className="w-4 h-4" />
                                                                {item.humidity}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedBlend(item);
                                                            setShowCheckModal(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        Daily Check
                                                    </button>
                                                    {item.status === 'maturing' && getDaysInMaturation(item.maturation_date) >= item.expected_maturation_days && (
                                                        <button
                                                            onClick={() => updateStatus(item.id, 'ready')}
                                                            className="text-green-600 hover:text-green-800"
                                                        >
                                                            Mark Ready
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add to Maturation Modal */}
            {showAddModal && (
                <Modal title="Add Blend to Maturation" onClose={() => setShowAddModal(false)} size="large">
                    <form onSubmit={addToMaturation} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Production Order</label>
                                <select
                                    value={formData.production_order_id}
                                    onChange={(e) => {
                                        const selectedOrder = completedOrders.find(o => o.id.toString() === e.target.value);
                                        setFormData({
                                            ...formData,
                                            production_order_id: e.target.value,
                                            blend_name: selectedOrder?.product_name || '',
                                            quantity_expected: selectedOrder?.quantity || ''
                                        });
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                >
                                    <option value="">Select Order</option>
                                    {completedOrders.map(order => (
                                        <option key={order.id} value={order.id}>
                                            {order.order_number} - {order.product_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number</label>
                                <input
                                    type="text"
                                    value={formData.batch_number}
                                    onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="Enter unique batch number"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Produced</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.quantity_produced}
                                    onChange={(e) => setFormData({...formData, quantity_produced: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Expected</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.quantity_expected}
                                    onChange={(e) => setFormData({...formData, quantity_expected: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                                <select
                                    value={formData.unit_of_measurement}
                                    onChange={(e) => setFormData({...formData, unit_of_measurement: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="kg">Kilograms</option>
                                    <option value="tons">Tons</option>
                                    <option value="liters">Liters</option>
                                    <option value="units">Units</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Storage Location</label>
                                <input
                                    type="text"
                                    value={formData.storage_location}
                                    onChange={(e) => setFormData({...formData, storage_location: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="e.g., Room A1, Bay 3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Maturation (days)</label>
                                <input
                                    type="number"
                                    value={formData.expected_maturation_days}
                                    onChange={(e) => setFormData({...formData, expected_maturation_days: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Temperature (°C)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.temperature}
                                    onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Humidity (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.humidity}
                                    onChange={(e) => setFormData({...formData, humidity: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                Add to Maturation
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Daily Check Modal */}
            {showCheckModal && selectedBlend && (
                <Modal title="Daily Maturation Check" onClose={() => setShowCheckModal(false)}>
                    <form onSubmit={addDailyCheck} className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-gray-700">Blend: {selectedBlend.blend_name}</p>
                            <p className="text-sm text-gray-500">Batch: {selectedBlend.batch_number}</p>
                            <p className="text-sm text-gray-500">Days maturing: {getDaysInMaturation(selectedBlend.maturation_date)}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Temperature (°C)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={dailyCheckData.temperature}
                                    onChange={(e) => setDailyCheckData({...dailyCheckData, temperature: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Humidity (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={dailyCheckData.humidity}
                                    onChange={(e) => setDailyCheckData({...dailyCheckData, humidity: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Visual Condition</label>
                            <select
                                value={dailyCheckData.visual_condition}
                                onChange={(e) => setDailyCheckData({...dailyCheckData, visual_condition: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                {visualConditions.map(condition => (
                                    <option key={condition} value={condition}>{condition}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                            <textarea
                                value={dailyCheckData.notes}
                                onChange={(e) => setDailyCheckData({...dailyCheckData, notes: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                rows="3"
                                placeholder="Any observations or notes..."
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <Button type="button" variant="secondary" onClick={() => setShowCheckModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                Save Check
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}