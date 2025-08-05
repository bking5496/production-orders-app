import React from 'react';
import ReactDOM from 'react-dom';

/**
 * A reusable Modal component that renders its content in a portal.
 * This is a standard practice in React to prevent CSS layout issues.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The content to display inside the modal.
 * @param {Function} props.onClose - Function to call when the modal should be closed.
 * @param {string} [props.title] - An optional title to display at the top of the modal.
 */
export const Modal = ({ children, onClose, title, size = "medium", className = "" }) => {
    // Define size classes with better height handling
    const sizeClasses = {
        small: "max-w-md w-full mx-4 max-h-[90vh]",
        medium: "max-w-2xl w-full mx-4 max-h-[90vh]", 
        large: "max-w-7xl w-full mx-4 max-h-[95vh]",
        fullscreen: "max-w-[98vw] w-[98vw] h-[95vh]"
    };

    const baseClasses = "bg-white rounded-lg shadow-xl transform transition-all duration-300 flex flex-col";
    const modalClasses = `${baseClasses} ${sizeClasses[size]} ${className}`;
    
    // We render the modal into the 'portal-root' div in your index.html
    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300 p-4" 
            onClick={onClose}
        >
            <div 
                className={modalClasses}
                onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the modal
            >
                {title && (
                    <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto">
                    {children}  
                </div>
            </div>
        </div>,
        document.getElementById('portal-root')
    );
};

/**
 * A reusable Card component with consistent styling
 */
export const Card = ({ children, className = "", ...props }) => {
    return (
        <div 
            className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

/**
 * A reusable Button component with variants
 */
export const Button = ({ 
    children, 
    variant = "default", 
    size = "md", 
    className = "", 
    disabled = false,
    ...props 
}) => {
    const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
        default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
        outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
        success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
        warning: "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500"
    };
    
    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };
    
    return (
        <button
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};

/**
 * A reusable Badge component for status indicators
 */
export const Badge = ({ 
    children, 
    variant = "default", 
    size = "md",
    className = "",
    ...props 
}) => {
    const baseClasses = "inline-flex items-center font-medium rounded-full";
    
    const variants = {
        default: "bg-gray-100 text-gray-800",
        success: "bg-green-100 text-green-800",
        danger: "bg-red-100 text-red-800",
        warning: "bg-yellow-100 text-yellow-800",
        info: "bg-blue-100 text-blue-800"
    };
    
    const sizes = {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm"
    };
    
    return (
        <span 
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
};
