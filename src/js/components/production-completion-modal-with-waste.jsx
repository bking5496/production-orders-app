import React, { useState, useEffect } from 'react';
import { Modal } from './ui-components.jsx';
import API from '../core/api';

export default function ProductionCompletionModalWithWaste({ isOpen, onClose, order, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    actual_quantity: 0,
    notes: '',
    waste_powder: 0,
    waste_corrugated_box: 0,
    waste_paper: 0,
    waste_display: 0
  });
  const [error, setError] = useState('');

  // When the 'order' prop changes, update the form's default data
  useEffect(() => {
    if (order) {
      setFormData({
        actual_quantity: order.quantity || 0,
        notes: '',
        waste_powder: 0,
        waste_corrugated_box: 0,
        waste_paper: 0,
        waste_display: 0
      });
      setError('');
    }
  }, [order]);

  // Don't render anything if the modal isn't supposed to be open
  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await API.post(`/orders/${order.id}/complete`, formData);
      onComplete(response); // Notify the parent component (OrdersPage) that we're done
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to complete order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Complete Production" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700">Actual Quantity Produced</label>
          <input
            type="number"
            value={formData.actual_quantity}
            onChange={(e) => setFormData({ ...formData, actual_quantity: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded mt-1"
            required
          />
        </div>
        <h3 className="font-medium text-gray-700 pt-2 border-t">Waste Tracking (Packaging)</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Powder Waste (kg)</label>
          <input type="number" step="0.01" value={formData.waste_powder} onChange={(e) => setFormData({ ...formData, waste_powder: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Corrugated Box Waste (kg)</label>
          <input type="number" step="0.01" value={formData.waste_corrugated_box} onChange={(e) => setFormData({ ...formData, waste_corrugated_box: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded mt-1" />
        </div>
         <div>
          <label className="block text-sm font-medium text-gray-700">Paper Waste (kg)</label>
          <input type="number" step="0.01" value={formData.waste_paper} onChange={(e) => setFormData({ ...formData, waste_paper: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded mt-1" />
        </div>
         <div>
          <label className="block text-sm font-medium text-gray-700">Display Waste (kg)</label>
          <input type="number" step="0.01" value={formData.waste_display} onChange={(e) => setFormData({ ...formData, waste_display: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border rounded mt-1" rows="3"></textarea>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100" disabled={loading}>Cancel</button>
          <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50" disabled={loading}>
            {loading ? 'Completing...' : 'Complete Production'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
