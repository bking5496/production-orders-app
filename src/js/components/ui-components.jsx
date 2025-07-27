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
export const Modal = ({ children, onClose, title }) => {
    // We render the modal into the 'portal-root' div in your index.html
    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300" 
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-300" 
                onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the modal
            >
                {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
                {children}
            </div>
        </div>,
        document.getElementById('portal-root')
    );
};

// You can add other reusable components like Button, Input, etc., here in the future.
