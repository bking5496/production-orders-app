import React, { useState, useEffect, useRef } from 'react';
import API from '../core/api';
import { Icon } from './layout-components.jsx';

export default function LabourLayoutPage() {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null); // Ref to access the hidden file input

    const fetchTodaysRoster = async () => {
        setLoading(true);
        try {
            const data = await API.get('/labour/today');
            setWorkers(data);
        } catch (error) {
            console.error("Failed to fetch today's roster:", error);
            alert("Failed to load today's roster. Please check the server connection.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTodaysRoster();
    }, []);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('rosterFile', file);

        try {
            const response = await fetch('/api/labour/upload', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Upload failed');
            }
            const result = await response.json();
            alert(result.message || 'Roster uploaded successfully!');
            fetchTodaysRoster();
        } catch (error) {
            alert('Error uploading roster: ' + error.message);
        }
    };

    const handleVerify = async (workerId) => {
        try {
            await API.put(`/labour/verify/${workerId}`);
            setWorkers(currentWorkers => 
                currentWorkers.map(w => w.id === workerId ? { ...w, status: 'present' } : w)
            );
        } catch (error) {
            alert('Failed to verify worker: ' + error.message);
        }
    };
    
    const handleDownload = () => {
        window.location.href = '/api/labour/export';
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Daily Labour Layout</h1>

            <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Today's Roster</h2>
                    <div className="flex space-x-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls, .csv" />
                        <button onClick={() => fileInputRef.current.click()} className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">Upload Roster</button>
                        <button onClick={handleDownload} className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">Download Report</button>
                    </div>
                </div>
                <div className="overflow-auto" style={{maxHeight: '60vh'}}>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Production Area</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-4 text-gray-500">Loading...</td></tr>
                            ) : workers.map(worker => (
                                <tr key={worker.id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{worker.name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{worker.production_area}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{worker.position}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{worker.shift}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${worker.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{worker.status}</span>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        {worker.status === 'pending' && (
                                            <button onClick={() => handleVerify(worker.id)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Verify Arrival</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
