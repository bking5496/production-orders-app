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
 * Format employee code for display - standardize to 4-digit format
 * @param {string|number} code - Employee code or user ID
 * @returns {string} - Formatted employee code (4-digit format)
 */
export const formatEmployeeCode = (code) => {
    if (!code) return 'N/A';
    
    // If it's already a 4-digit number, return as-is
    if (typeof code === 'number' || /^\d{4}$/.test(code)) {
        return code.toString().padStart(4, '0');
    }
    
    // If it's in EMP format (EMP0001, EMP001, etc.), extract the number
    if (typeof code === 'string' && code.toUpperCase().startsWith('EMP')) {
        const numericPart = code.replace(/^EMP0*/i, '');
        if (/^\d+$/.test(numericPart)) {
            return numericPart.padStart(4, '0');
        }
    }
    
    // If it's a plain number as string, format it
    if (typeof code === 'string' && /^\d+$/.test(code)) {
        return code.padStart(4, '0');
    }
    
    // Return as-is if we can't parse it
    return code.toString();
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