import React, { useState, useEffect, forwardRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Check, AlertTriangle, Info, Loader2, ChevronDown, Eye, EyeOff } from 'lucide-react';

/**
 * Enhanced Modal component with animations, accessibility, and better UX
 * Features: ESC key support, focus management, backdrop blur, animation states
 */
export const Modal = ({ 
    children, 
    onClose, 
    title, 
    size = "medium", 
    className = "",
    showCloseButton = true,
    closeOnBackdrop = true,
    closeOnEscape = true,
    footer,
    ...props 
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Trigger entry animation
        setIsVisible(true);
        setIsAnimating(true);
        
        // Disable body scroll
        document.body.style.overflow = 'hidden';
        
        // Focus management
        const previouslyFocused = document.activeElement;
        
        return () => {
            document.body.style.overflow = 'unset';
            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus();
            }
        };
    }, []);

    useEffect(() => {
        if (!closeOnEscape) return;
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [closeOnEscape, onClose]);

    const handleClose = () => {
        if (!onClose) return;
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 200); // Wait for exit animation
    };

    const handleBackdropClick = (e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Define size classes with better responsive handling
    const sizeClasses = {
        sm: "max-w-sm w-full mx-4 max-h-[85vh]",
        medium: "max-w-2xl w-full mx-4 max-h-[90vh]", 
        large: "max-w-6xl w-full mx-4 max-h-[95vh]",
        xl: "max-w-7xl w-full mx-4 max-h-[95vh]",
        fullscreen: "max-w-[98vw] w-[98vw] h-[95vh]"
    };

    const baseClasses = "bg-white rounded-xl shadow-2xl transform transition-all duration-200 flex flex-col relative";
    const modalClasses = `${baseClasses} ${sizeClasses[size]} ${className}`;
    
    // Animation classes
    const backdropClasses = `fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-200 p-4 ${
        isVisible ? 'opacity-100' : 'opacity-0'
    }`;
    
    const contentClasses = `${modalClasses} ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
    }`;
    
    return ReactDOM.createPortal(
        <div 
            className={backdropClasses}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            {...props}
        >
            <div className={contentClasses}>
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 flex items-center justify-between">
                        {title && (
                            <h2 id="modal-title" className="text-xl font-bold text-gray-900">
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={handleClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="Close modal"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
                
                {/* Footer */}
                {footer && (
                    <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.getElementById('portal-root') || document.body
    );
};

/**
 * Enhanced Card component with variants, hover effects, and accessibility
 */
export const Card = ({ 
    children, 
    className = "", 
    variant = "default",
    padding = "default",
    hover = false,
    clickable = false,
    loading = false,
    ...props 
}) => {
    const variants = {
        default: "bg-white border border-gray-200 shadow-sm",
        elevated: "bg-white border border-gray-200 shadow-lg",
        outlined: "bg-white border-2 border-gray-300 shadow-none",
        ghost: "bg-transparent border border-transparent shadow-none",
        gradient: "bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-md"
    };
    
    const paddingClasses = {
        none: "p-0",
        sm: "p-3",
        default: "p-6",
        lg: "p-8",
        xl: "p-10"
    };
    
    const baseClasses = "rounded-xl transition-all duration-200";
    const interactionClasses = hover ? "hover:shadow-md hover:-translate-y-0.5" : "";
    const clickableClasses = clickable ? "cursor-pointer hover:shadow-lg transform hover:scale-[1.02]" : "";
    
    const cardClasses = `${baseClasses} ${variants[variant]} ${paddingClasses[padding]} ${interactionClasses} ${clickableClasses} ${className}`;
    
    if (loading) {
        return (
            <div className={cardClasses} {...props}>
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className={cardClasses} {...props}>
            {children}
        </div>
    );
};

/**
 * Enhanced Button component with loading states, icons, and improved accessibility
 */
export const Button = forwardRef(({ 
    children, 
    variant = "primary", 
    size = "md", 
    className = "", 
    disabled = false,
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    ...props 
}, ref) => {
    const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transform";
    
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow-md",
        secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 shadow-sm hover:shadow-md",
        outline: "border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 hover:border-gray-400",
        ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
        success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow-md",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md",
        warning: "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 shadow-sm hover:shadow-md",
        info: "bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500 shadow-sm hover:shadow-md",
        gradient: "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 shadow-md hover:shadow-lg"
    };
    
    const sizes = {
        xs: "px-2 py-1 text-xs",
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        xl: "px-8 py-4 text-lg"
    };
    
    const widthClass = fullWidth ? "w-full" : "";
    const isDisabled = disabled || loading;
    
    return (
        <button
            ref={ref}
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
            disabled={isDisabled}
            {...props}
        >
            {loading && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {!loading && leftIcon && (
                <span className="mr-2">{leftIcon}</span>
            )}
            {children}
            {!loading && rightIcon && (
                <span className="ml-2">{rightIcon}</span>
            )}
        </button>
    );
});

Button.displayName = 'Button';

/**
 * Enhanced Badge component with icons, animations, and more variants
 */
export const Badge = ({ 
    children, 
    variant = "default", 
    size = "md",
    className = "",
    icon,
    pulse = false,
    removable = false,
    onRemove,
    ...props 
}) => {
    const baseClasses = "inline-flex items-center font-medium rounded-full transition-all duration-200";
    
    const variants = {
        default: "bg-gray-100 text-gray-800 border border-gray-200",
        primary: "bg-blue-100 text-blue-800 border border-blue-200",
        secondary: "bg-gray-100 text-gray-700 border border-gray-300",
        success: "bg-green-100 text-green-800 border border-green-200",
        danger: "bg-red-100 text-red-800 border border-red-200",
        warning: "bg-yellow-100 text-yellow-800 border border-yellow-200",
        info: "bg-cyan-100 text-cyan-800 border border-cyan-200",
        purple: "bg-purple-100 text-purple-800 border border-purple-200",
        pink: "bg-pink-100 text-pink-800 border border-pink-200",
        indigo: "bg-indigo-100 text-indigo-800 border border-indigo-200",
        // Solid variants
        solidPrimary: "bg-blue-600 text-white",
        solidSuccess: "bg-green-600 text-white",
        solidDanger: "bg-red-600 text-white",
        solidWarning: "bg-yellow-600 text-white",
        // Outline variants
        outlinePrimary: "border-2 border-blue-600 text-blue-600 bg-white",
        outlineSuccess: "border-2 border-green-600 text-green-600 bg-white",
        outlineDanger: "border-2 border-red-600 text-red-600 bg-white"
    };
    
    const sizes = {
        xs: "px-1.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
        xl: "px-4 py-1.5 text-sm"
    };
    
    const pulseClass = pulse ? "animate-pulse" : "";
    
    return (
        <span 
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${pulseClass} ${className}`}
            {...props}
        >
            {icon && (
                <span className="mr-1">{icon}</span>
            )}
            {children}
            {removable && onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                    aria-label="Remove badge"
                >
                    <X size={12} />
                </button>
            )}
        </span>
    );
};

/**
 * Enhanced Input component with validation states and icons
 */
export const Input = forwardRef(({ 
    className = "",
    type = "text",
    error,
    label,
    placeholder,
    leftIcon,
    rightIcon,
    disabled = false,
    required = false,
    helperText,
    size = "md",
    ...props 
}, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    
    const sizes = {
        sm: "px-3 py-2 text-sm",
        md: "px-4 py-3 text-sm",
        lg: "px-4 py-4 text-base"
    };
    
    const baseClasses = "block w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1";
    const normalClasses = "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
    const errorClasses = "border-red-300 focus:border-red-500 focus:ring-red-500";
    const disabledClasses = "bg-gray-50 text-gray-500 cursor-not-allowed";
    
    const stateClasses = error ? errorClasses : normalClasses;
    const inputClasses = `${baseClasses} ${sizes[size]} ${stateClasses} ${disabled ? disabledClasses : ''} ${leftIcon ? 'pl-10' : ''} ${(rightIcon || type === 'password') ? 'pr-10' : ''} ${className}`;
    
    const inputType = type === 'password' && showPassword ? 'text' : type;
    
    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400">{leftIcon}</span>
                    </div>
                )}
                <input
                    ref={ref}
                    type={inputType}
                    className={inputClasses}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    {...props}
                />
                {type === 'password' && (
                    <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                        )}
                    </button>
                )}
                {rightIcon && type !== 'password' && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-400">{rightIcon}</span>
                    </div>
                )}
            </div>
            {error && (
                <p className="text-sm text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {error}
                </p>
            )}
            {helperText && !error && (
                <p className="text-sm text-gray-500">{helperText}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

/**
 * Enhanced Select component with search and custom styling
 */
export const Select = forwardRef(({ 
    className = "",
    options = [],
    placeholder = "Select an option",
    error,
    label,
    required = false,
    disabled = false,
    size = "md",
    ...props 
}, ref) => {
    const sizes = {
        sm: "px-3 py-2 text-sm",
        md: "px-4 py-3 text-sm",
        lg: "px-4 py-4 text-base"
    };
    
    const baseClasses = "block w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 appearance-none bg-white";
    const normalClasses = "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
    const errorClasses = "border-red-300 focus:border-red-500 focus:ring-red-500";
    const disabledClasses = "bg-gray-50 text-gray-500 cursor-not-allowed";
    
    const stateClasses = error ? errorClasses : normalClasses;
    const selectClasses = `${baseClasses} ${sizes[size]} ${stateClasses} ${disabled ? disabledClasses : ''} pr-10 ${className}`;
    
    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    ref={ref}
                    className={selectClasses}
                    disabled={disabled}
                    required={required}
                    {...props}
                >
                    {placeholder && (
                        <option value="">{placeholder}</option>
                    )}
                    {options.map((option, index) => (
                        <option 
                            key={option.value || index} 
                            value={option.value}
                            disabled={option.disabled}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {error && (
                <p className="text-sm text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {error}
                </p>
            )}
        </div>
    );
});

Select.displayName = 'Select';

/**
 * Alert component for notifications and messages
 */
export const Alert = ({ 
    children, 
    variant = "info", 
    className = "",
    icon,
    title,
    closable = false,
    onClose,
    ...props 
}) => {
    const [isVisible, setIsVisible] = useState(true);
    
    const variants = {
        info: {
            container: "bg-blue-50 border-blue-200 text-blue-900",
            icon: <Info className="w-5 h-5" />,
            iconColor: "text-blue-600"
        },
        success: {
            container: "bg-green-50 border-green-200 text-green-900",
            icon: <Check className="w-5 h-5" />,
            iconColor: "text-green-600"
        },
        warning: {
            container: "bg-yellow-50 border-yellow-200 text-yellow-900",
            icon: <AlertTriangle className="w-5 h-5" />,
            iconColor: "text-yellow-600"
        },
        error: {
            container: "bg-red-50 border-red-200 text-red-900",
            icon: <AlertTriangle className="w-5 h-5" />,
            iconColor: "text-red-600"
        }
    };
    
    const variantConfig = variants[variant];
    const displayIcon = icon || variantConfig.icon;
    
    const handleClose = () => {
        setIsVisible(false);
        if (onClose) {
            setTimeout(() => onClose(), 150);
        }
    };
    
    if (!isVisible) return null;
    
    return (
        <div 
            className={`border rounded-lg p-4 transition-all duration-150 ${variantConfig.container} ${className}`}
            {...props}
        >
            <div className="flex items-start">
                {displayIcon && (
                    <div className={`flex-shrink-0 mr-3 ${variantConfig.iconColor}`}>
                        {displayIcon}
                    </div>
                )}
                <div className="flex-1">
                    {title && (
                        <h4 className="font-medium mb-1">{title}</h4>
                    )}
                    <div className="text-sm">{children}</div>
                </div>
                {closable && (
                    <button
                        onClick={handleClose}
                        className={`flex-shrink-0 ml-3 p-1 rounded-md hover:bg-black/5 transition-colors ${variantConfig.iconColor}`}
                        aria-label="Close alert"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * Loading Spinner component
 */
export const Spinner = ({ 
    size = "md", 
    className = "",
    color = "blue"
}) => {
    const sizes = {
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-8 h-8",
        xl: "w-12 h-12"
    };
    
    const colors = {
        blue: "text-blue-600",
        gray: "text-gray-600",
        green: "text-green-600",
        red: "text-red-600",
        white: "text-white"
    };
    
    return (
        <Loader2 className={`animate-spin ${sizes[size]} ${colors[color]} ${className}`} />
    );
};

/**
 * Tooltip component for additional information
 */
export const Tooltip = ({ 
    children, 
    content, 
    position = "top",
    className = ""
}) => {
    const [isVisible, setIsVisible] = useState(false);
    
    const positions = {
        top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
        left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
        right: "left-full top-1/2 transform -translate-y-1/2 ml-2"
    };
    
    const arrows = {
        top: "top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900",
        bottom: "bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900",
        left: "left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900",
        right: "right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"
    };
    
    return (
        <div 
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className={`absolute z-50 ${positions[position]}`}>
                    <div className={`bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap max-w-xs ${className}`}>
                        {content}
                    </div>
                    <div className={`absolute ${arrows[position]} w-0 h-0`}></div>
                </div>
            )}
        </div>
    );
};
