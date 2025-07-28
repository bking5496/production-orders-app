import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    const { user, checkAuth } = useAuth();
    const [profile, setProfile] = useState({ email: '', fullName: '', phone: '' });
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [message, setMessage] = useState({ text: '', type: 'success' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (user) {
            setProfile({
                email: user.email || '',
                fullName: user.fullName || '',
                phone: user.phone || ''
            });
        }
    }, [user]);

    const validateProfile = useCallback((profileData) => {
        const newErrors = {};
        if (!profileData.email?.trim()) newErrors.email = 'Email is required';
        if (!profileData.fullName?.trim()) newErrors.fullName = 'Full name is required';
        if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        return newErrors;
    }, []);

    const handleProfileUpdate = useCallback(async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: 'success' });
        setErrors({});
        
        const validationErrors = validateProfile(profile);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            await API.put('/settings/profile', profile);
            setMessage({ text: 'Profile updated successfully!', type: 'success' });
            await checkAuth();
        } catch (error) {
            setMessage({ text: error.response?.data?.message || 'Failed to update profile', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    }, [profile, validateProfile, checkAuth]);

    const getPasswordStrength = useCallback((password) => {
        if (!password) return { score: 0, text: '', color: '' };
        
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        score = Object.values(checks).filter(Boolean).length;
        
        const strength = {
            0: { text: '', color: '' },
            1: { text: 'Very Weak', color: 'text-red-600' },
            2: { text: 'Weak', color: 'text-red-500' },
            3: { text: 'Fair', color: 'text-yellow-500' },
            4: { text: 'Good', color: 'text-blue-500' },
            5: { text: 'Strong', color: 'text-green-500' }
        };
        
        return { score, ...strength[score], checks };
    }, []);

    const validatePassword = useCallback((data) => {
        const newErrors = {};
        if (!data.currentPassword) newErrors.currentPassword = 'Current password is required';
        if (!data.newPassword) newErrors.newPassword = 'New password is required';
        
        const strength = getPasswordStrength(data.newPassword);
        if (data.newPassword && strength.score < 3) {
            newErrors.newPassword = 'Password is too weak. Please include uppercase, lowercase, numbers, and special characters.';
        }
        
        if (data.newPassword !== data.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        return newErrors;
    }, [getPasswordStrength]);

    const handlePasswordChange = useCallback(async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: 'success' });
        setErrors({});
        
        const validationErrors = validatePassword(passwordData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            await API.post('/settings/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setMessage({ text: 'Password changed successfully!', type: 'success' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            setMessage({ text: error.response?.data?.message || 'Failed to change password', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    }, [passwordData, validatePassword]);

    return (
        <div className="space-y-6">
            {message.text && <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</div>}
            <ContentCard title="Profile Information">
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input 
                                id="fullName"
                                type="text" 
                                value={profile.fullName} 
                                onChange={e => setProfile({ ...profile, fullName: e.target.value })} 
                                className={`mt-1 block w-full border rounded-md shadow-sm px-3 py-2 ${errors.fullName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                                aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                                disabled={isSubmitting}
                            />
                            {errors.fullName && <p id="fullName-error" className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                            <input 
                                id="phone"
                                type="tel" 
                                value={profile.phone} 
                                onChange={e => setProfile({ ...profile, phone: e.target.value })} 
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input 
                            id="email"
                            type="email" 
                            value={profile.email} 
                            onChange={e => setProfile({ ...profile, email: e.target.value })} 
                            className={`mt-1 block w-full border rounded-md shadow-sm px-3 py-2 ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                            aria-describedby={errors.email ? 'email-error' : undefined}
                            disabled={isSubmitting}
                            required 
                        />
                        {errors.email && <p id="email-error" className="mt-1 text-sm text-red-600">{errors.email}</p>}
                    </div>
                    <div className="flex justify-end">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isSubmitting && (
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isSubmitting ? 'Updating...' : 'Update Profile'}
                        </button>
                    </div>
                </form>
            </ContentCard>

            <ContentCard title="Change Password">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input 
                            id="currentPassword"
                            type="password" 
                            value={passwordData.currentPassword} 
                            onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} 
                            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${errors.currentPassword ? 'border-red-300' : 'border-gray-300'}`}
                            aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
                            disabled={isSubmitting}
                            required 
                        />
                        {errors.currentPassword && <p id="currentPassword-error" className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>}
                    </div>
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input 
                            id="newPassword"
                            type="password" 
                            value={passwordData.newPassword} 
                            onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} 
                            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${errors.newPassword ? 'border-red-300' : 'border-gray-300'}`}
                            aria-describedby={errors.newPassword ? 'newPassword-error' : 'newPassword-help'}
                            disabled={isSubmitting}
                            required 
                        />
                        {(() => {
                            const strength = getPasswordStrength(passwordData.newPassword);
                            return (
                                <div className="mt-2">
                                    {passwordData.newPassword && (
                                        <div className="mb-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs text-gray-600">Password strength:</span>
                                                <span className={`text-xs font-medium ${strength.color}`}>{strength.text}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className={`h-2 rounded-full transition-all duration-300 ${
                                                        strength.score === 1 ? 'bg-red-400 w-1/5' :
                                                        strength.score === 2 ? 'bg-red-400 w-2/5' :
                                                        strength.score === 3 ? 'bg-yellow-400 w-3/5' :
                                                        strength.score === 4 ? 'bg-blue-400 w-4/5' :
                                                        strength.score === 5 ? 'bg-green-400 w-full' : 'w-0'
                                                    }`}
                                                ></div>
                                            </div>
                                            <div className="mt-2 text-xs text-gray-600">
                                                <div className="grid grid-cols-2 gap-1">
                                                    <span className={strength.checks?.length ? 'text-green-600' : 'text-gray-400'}>✓ 8+ characters</span>
                                                    <span className={strength.checks?.uppercase ? 'text-green-600' : 'text-gray-400'}>✓ Uppercase</span>
                                                    <span className={strength.checks?.lowercase ? 'text-green-600' : 'text-gray-400'}>✓ Lowercase</span>
                                                    <span className={strength.checks?.numbers ? 'text-green-600' : 'text-gray-400'}>✓ Numbers</span>
                                                    <span className={strength.checks?.special ? 'text-green-600' : 'text-gray-400'}>✓ Special chars</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <p id="newPassword-help" className="text-xs text-gray-500">Include uppercase, lowercase, numbers, and special characters</p>
                                    {errors.newPassword && <p id="newPassword-error" className="mt-1 text-sm text-red-600">{errors.newPassword}</p>}
                                </div>
                            );
                        })()}
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input 
                            id="confirmPassword"
                            type="password" 
                            value={passwordData.confirmPassword} 
                            onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} 
                            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'}`}
                            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                            disabled={isSubmitting}
                            required 
                        />
                        {errors.confirmPassword && <p id="confirmPassword-error" className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                    </div>
                    <div className="flex justify-end">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isSubmitting && (
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isSubmitting ? 'Changing...' : 'Change Password'}
                        </button>
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
    const [message, setMessage] = useState({ text: '', type: 'success' });
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleSave = useCallback(async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: 'success' });
        setIsSubmitting(true);
        
        try {
            await API.put('/settings/system', settings);
            setMessage({ text: 'Settings saved successfully!', type: 'success' });
        } catch (error) {
            setMessage({ text: error.response?.data?.message || 'Failed to save settings', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    }, [settings]);

    if (loading) return (
        <div className="flex items-center justify-center p-8" role="status" aria-label="Loading system settings">
            <svg className="animate-spin h-6 w-6 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading system settings...
        </div>
    );

    return (
         <ContentCard title="System Configuration">
             {message.text && (
                 <div 
                     className={`p-3 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                     role="alert"
                     aria-live="polite"
                 >
                     {message.text}
                 </div>
             )}
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
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isSubmitting && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isSubmitting ? 'Saving...' : 'Save System Settings'}
                    </button>
                </div>
            </form>
        </ContentCard>
    );
};


export function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const { user } = useAuth();

    const tabs = useMemo(() => [
        { id: 'profile', label: 'Profile' },
        user?.role === 'admin' && { id: 'system', label: 'System' }
    ].filter(Boolean), [user?.role]);

    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
    }, []);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => handleTabChange(tab.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            aria-controls={`${tab.id}-panel`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div role="tabpanel">
                {activeTab === 'profile' && (
                    <div id="profile-panel" aria-labelledby="profile-tab">
                        <ProfileSettings />
                    </div>
                )}
                {activeTab === 'system' && user?.role === 'admin' && (
                    <div id="system-panel" aria-labelledby="system-tab">
                        <SystemSettings />
                    </div>
                )}
            </div>
        </div>
    );
}
