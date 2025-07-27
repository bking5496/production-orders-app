import React, { useState, useEffect } from 'react';
import API from '../core/api';
import { useAuth } from '../core/auth';

// Reusable component for a settings card
const ContentCard = ({ title, children }) => (
    <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
        <div className="px-4 py-5 sm:p-6">{children}</div>
    </div>
);

// Component for managing user profile
const ProfileSettings = () => {
    const { user, checkAuth } = useAuth(); // Get checkAuth to refresh user data
    const [profile, setProfile] = useState({ email: '', fullName: '', phone: '' });
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [message, setMessage] = useState({ text: '', type: 'success' });

    useEffect(() => {
        if (user) {
            setProfile({
                email: user.email || '',
                fullName: user.fullName || '',
                phone: user.phone || ''
            });
        }
    }, [user]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setMessage({text: ''});
        try {
            await API.put('/settings/profile', profile);
            setMessage({ text: 'Profile updated successfully!', type: 'success' });
            await checkAuth(); // Refresh the user context with new data
        } catch (error) {
            setMessage({ text: 'Error: ' + error.message, type: 'error' });
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMessage({text: ''});
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return setMessage({ text: 'New passwords do not match.', type: 'error' });
        }
        try {
            await API.post('/settings/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setMessage({ text: 'Password changed successfully!', type: 'success' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            setMessage({ text: 'Error: ' + error.message, type: 'error' });
        }
    };

    return (
        <div className="space-y-6">
            {message.text && <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</div>}
            <ContentCard title="Profile Information">
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input type="text" value={profile.fullName} onChange={e => setProfile({ ...profile, fullName: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                            <input type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Update Profile</button>
                    </div>
                </form>
            </ContentCard>

            <ContentCard title="Change Password">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <input type="password" placeholder="Current Password" value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} className="w-full px-3 py-2 border rounded" required />
                    <input type="password" placeholder="New Password" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} className="w-full px-3 py-2 border rounded" required />
                    <input type="password" placeholder="Confirm New Password" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} className="w-full px-3 py-2 border rounded" required />
                    <div className="flex justify-end">
                        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Change Password</button>
                    </div>
                </form>
            </ContentCard>
        </div>
    );
};

// Component for managing system settings
const SystemSettings = () => {
    const [settings, setSettings] = useState({ maintenanceMode: false, sessionTimeout: 30 });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await API.get('/settings/system');
                // Ensure defaults if data is empty
                setSettings(prev => ({...prev, ...data}));
            } catch (error) {
                console.error("Failed to load system settings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await API.put('/settings/system', settings);
            setMessage('Settings saved successfully!');
        } catch (error) {
            setMessage('Error saving settings: ' + error.message);
        }
    };

    if (loading) return <div>Loading system settings...</div>;

    return (
         <ContentCard title="System Configuration">
             {message && <div className="p-3 mb-4 bg-green-100 text-green-800 rounded">{message}</div>}
            <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <div>
                        <label htmlFor="maintenanceMode" className="font-medium text-gray-700">Maintenance Mode</label>
                        <p className="text-xs text-gray-500">Prevents non-admins from accessing the system.</p>
                    </div>
                    <input id="maintenanceMode" type="checkbox" checked={settings.maintenanceMode} onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})} className="h-4 w-4 rounded text-blue-600 border-gray-300"/>
                </div>
                 <div>
                    <label htmlFor="sessionTimeout" className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                    <input id="sessionTimeout" type="number" value={settings.sessionTimeout} onChange={e => setSettings({...settings, sessionTimeout: parseInt(e.target.value) || 30})} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div className="flex justify-end pt-4 border-t">
                    <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save System Settings</button>
                </div>
            </form>
        </ContentCard>
    );
};


// Main Settings Page Component
export function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const { user } = useAuth();

    const tabs = [
        { id: 'profile', label: 'Profile' },
        user?.role === 'admin' && { id: 'system', label: 'System' }
    ].filter(Boolean); // filter(Boolean) removes any false values (like for non-admins)

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div>
                {activeTab === 'profile' && <ProfileSettings />}
                {activeTab === 'system' && user?.role === 'admin' && <SystemSettings />}
            </div>
        </div>
    );
}
