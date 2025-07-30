// Text utility functions for consistent formatting

/**
 * Capitalize each word in a string (Title Case)
 * @param {string} str - The string to capitalize
 * @returns {string} - Capitalized string
 */
export const capitalizeWords = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Format user display name consistently
 * @param {object} user - User object with username and other properties
 * @returns {string} - Formatted display name
 */
export const formatUserDisplayName = (user) => {
    if (!user) return 'Unknown';
    
    // Use fullName if available, otherwise use username
    const name = user.fullName || user.username || 'Unknown';
    return capitalizeWords(name);
};

/**
 * Format employee code for display
 * @param {string} code - Employee code
 * @returns {string} - Formatted employee code
 */
export const formatEmployeeCode = (code) => {
    if (!code) return 'N/A';
    return code.toUpperCase();
};

/**
 * Format role name for display
 * @param {string} role - Role name
 * @returns {string} - Formatted role name
 */
export const formatRoleName = (role) => {
    if (!role) return 'N/A';
    
    // Handle special cases
    const roleMap = {
        'hopper': 'Hopper Loader',
        'operator': 'Operator',
        'operator(ar)': 'Operator(AR)',
        'packer': 'Packer',
        'supervisor': 'Supervisor',
        'admin': 'Administrator'
    };
    
    return roleMap[role.toLowerCase()] || capitalizeWords(role);
};