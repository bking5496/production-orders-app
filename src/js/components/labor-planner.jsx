import React, { useState, useEffect } from 'react';
import { Calendar, Factory } from 'lucide-react';
import API from '../core/api';

const LaborPlanner = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [scheduledMachines, setScheduledMachines] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch scheduled machines when date changes
  useEffect(() => {
    fetchScheduledMachines();
  }, [selectedDate]);

  const fetchScheduledMachines = async () => {
    try {
      setLoading(true);
      // Fetch machines that have orders scheduled for the selected date
      const response = await API.get(`/orders?date=${selectedDate}`);
      const orders = response.data || [];
      
      // Extract machines from orders
      const machines = orders.filter(order => order.machine_id).map(order => ({
        id: order.machine_id,
        name: order.machine_name || `Machine ${order.machine_id}`,
        order_number: order.order_number,
        product_name: order.product_name,
        // Will get machine config from machines table
        operators_per_shift: order.operators_per_shift || 1,
        hopper_loaders_per_shift: order.hopper_loaders_per_shift || 0,
        packers_per_shift: order.packers_per_shift || 0
      }));
      
      setScheduledMachines(machines);
    } catch (error) {
      console.error('Failed to fetch scheduled machines:', error);
      setScheduledMachines([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header with Date Picker */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Labor Planning</h1>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <label htmlFor="date-picker" className="text-sm font-medium text-gray-700">
            Select Date:
          </label>
          <input
            id="date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Scheduled Machines */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Scheduled Machines for {selectedDate}
        </h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading scheduled machines...</p>
          </div>
        ) : scheduledMachines.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Factory className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No machines scheduled for this date</p>
            <p className="text-sm text-gray-500">Check orders.jsx to schedule machines</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledMachines.map(machine => (
              <div key={machine.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{machine.name}</h3>
                    <p className="text-sm text-blue-600">Order: {machine.order_number}</p>
                    {machine.product_name && (
                      <p className="text-sm text-gray-600">Product: {machine.product_name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">Required per shift:</p>
                    <div className="text-xs text-gray-600">
                      {machine.operators_per_shift} operators
                      {machine.hopper_loaders_per_shift > 0 && `, ${machine.hopper_loaders_per_shift} hopper loaders`}
                      {machine.packers_per_shift > 0 && `, ${machine.packers_per_shift} packers`}
                    </div>
                  </div>
                </div>
                
                {/* Shift Assignment - Coming Next */}
                <div className="border-t pt-4">
                  <p className="text-gray-500 text-center">
                    Shift assignment (day, night, both) will be added next...
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// For compatibility with existing imports
export const LaborManagementSystem = LaborPlanner;

export default LaborPlanner;