import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

const LaborPlanner = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

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

      {/* Content Area - will add machines and assignments here */}
      <div>
        <p className="text-gray-600">Selected date: {selectedDate}</p>
        <p className="text-gray-500 text-sm">Machines and assignments will appear here next...</p>
      </div>
    </div>
  );
};

// For compatibility with existing imports
export const LaborManagementSystem = LaborPlanner;

export default LaborPlanner;