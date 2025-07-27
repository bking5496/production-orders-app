// js/services/notification.js - Notification and Toast Service
// Handles user notifications, toasts, and alerts

class NotificationService {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.defaultDuration = 5000;
    this.positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
    };
    this.currentPosition = 'top-right';
    this.soundEnabled = true;
    this.init();
  }

  // Initialize notification container
  init() {
    // Create container if it doesn't exist
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = `fixed ${this.positions[this.currentPosition]} z-50 space-y-2 pointer-events-none`;
      this.container.style.maxWidth = '400px';
      this.container.style.width = '100%';
      document.body.appendChild(this.container);
    }

    // Load notification sound
    this.loadSound();

    // Listen for WebSocket notifications
    if (window.WS) {
      window.WS.subscribeToNotifications((data) => {
        this.show(data.message, data.type || 'info', data.options);
      });
    }
  }

  // Load notification sound
  loadSound() {
    this.audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIHWm98OScTgwOUarm7blmFwU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    this.audio.volume = 0.3;
  }

  // Play notification sound
  playSound() {
    if (this.soundEnabled && this.audio) {
      this.audio.play().catch(e => console.log('Could not play notification sound'));
    }
  }

  // Show notification
  show(message, type = 'info', options = {}) {
    const id = this.generateId();
    const notification = this.createNotification(id, message, type, options);
    
    // Add to container
    this.container.appendChild(notification);
    this.notifications.set(id, notification);
    
    // Make it clickable
    notification.style.pointerEvents = 'auto';
    
    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });
    
    // Play sound for certain types
    if (['success', 'error', 'warning'].includes(type) && !options.silent) {
      this.playSound();
    }
    
    // Auto dismiss
    if (options.duration !== 0) {
      const duration = options.duration || this.defaultDuration;
      setTimeout(() => this.dismiss(id), duration);
    }
    
    return id;
  }

  // Create notification element
  createNotification(id, message, type, options) {
    const notification = document.createElement('div');
    notification.id = `notification-${id}`;
    notification.className = this.getNotificationClasses(type);
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    notification.style.transition = 'all 0.3s ease';
    
    // Icon
    const icon = this.getIcon(type);
    
    // Build notification HTML
    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">${icon}</div>
        <div class="ml-3 w-0 flex-1">
          ${options.title ? `<p class="text-sm font-medium">${options.title}</p>` : ''}
          <p class="text-sm ${options.title ? 'mt-1' : ''}">${message}</p>
          ${options.actions ? this.renderActions(options.actions) : ''}
        </div>
        ${options.closeable !== false ? `
          <div class="ml-4 flex-shrink-0 flex">
            <button onclick="window.NotificationService.dismiss('${id}')" 
                    class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none">
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        ` : ''}
      </div>
    `;
    
    // Add click handler if provided
    if (options.onClick) {
      notification.style.cursor = 'pointer';
      notification.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          options.onClick();
          this.dismiss(id);
        }
      });
    }
    
    return notification;
  }

  // Get notification classes based on type
  getNotificationClasses(type) {
    const baseClasses = 'max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 p-4 mb-2';
    
    const typeClasses = {
      success: 'border-l-4 border-green-500',
      error: 'border-l-4 border-red-500',
      warning: 'border-l-4 border-yellow-500',
      info: 'border-l-4 border-blue-500',
      default: 'border-l-4 border-gray-500'
    };
    
    return `${baseClasses} ${typeClasses[type] || typeClasses.default}`;
  }

  // Get icon for notification type
  getIcon(type) {
    const icons = {
      success: `
        <svg class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `,
      error: `
        <svg class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `,
      warning: `
        <svg class="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      `,
      info: `
        <svg class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `,
      default: `
        <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `
    };
    
    return icons[type] || icons.default;
  }

  // Render action buttons
  renderActions(actions) {
    return `
      <div class="mt-3 flex space-x-2">
        ${actions.map(action => `
          <button onclick="window.NotificationService.handleAction('${action.id}')" 
                  class="text-sm font-medium ${action.primary ? 'text-blue-600 hover:text-blue-500' : 'text-gray-700 hover:text-gray-600'}">
            ${action.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  // Dismiss notification
  dismiss(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;
    
    // Animate out
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    // Remove after animation
    setTimeout(() => {
      notification.remove();
      this.notifications.delete(id);
    }, 300);
  }

  // Dismiss all notifications
  dismissAll() {
    this.notifications.forEach((_, id) => this.dismiss(id));
  }

  // Helper methods for different notification types
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', { duration: 8000, ...options });
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  // Show confirmation dialog
  async confirm(message, options = {}) {
    return new Promise((resolve) => {
      const id = this.show(message, options.type || 'warning', {
        duration: 0,
        closeable: false,
        title: options.title || 'Confirm',
        actions: [
          {
            id: 'confirm',
            label: options.confirmText || 'Confirm',
            primary: true,
            handler: () => {
              this.dismiss(id);
              resolve(true);
            }
          },
          {
            id: 'cancel',
            label: options.cancelText || 'Cancel',
            handler: () => {
              this.dismiss(id);
              resolve(false);
            }
          }
        ]
      });
    });
  }

  // Handle action button clicks
  handleAction(actionId) {
    // This is handled by inline onclick handlers
  }

  // Change notification position
  setPosition(position) {
    if (this.positions[position]) {
      this.currentPosition = position;
      this.container.className = `fixed ${this.positions[position]} z-50 space-y-2 pointer-events-none`;
    }
  }

  // Toggle sound
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Show API error with appropriate message
  showApiError(error) {
    let message = 'An error occurred. Please try again.';
    
    if (error.isNetworkError) {
      message = 'Network error. Please check your connection.';
    } else if (error.status === 401) {
      message = 'Authentication required. Please log in again.';
    } else if (error.status === 403) {
      message = 'You do not have permission to perform this action.';
    } else if (error.status === 404) {
      message = 'The requested resource was not found.';
    } else if (error.status >= 500) {
      message = 'Server error. Please try again later.';
    } else if (error.message) {
      message = error.message;
    }
    
    this.error(message);
  }

  // Integration with form validation
  showValidationErrors(errors) {
    const errorMessages = Object.entries(errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join('\n');
    
    this.error(errorMessages, {
      title: 'Validation Error',
      duration: 6000
    });
  }

  // Order-specific notifications
  orderCreated(orderNumber) {
    this.success(`Order ${orderNumber} created successfully`, {
      title: 'Order Created',
      onClick: () => window.dispatchEvent(new CustomEvent('navigate:orders'))
    });
  }

  orderStarted(orderNumber) {
    this.info(`Production started for order ${orderNumber}`, {
      title: 'Production Started'
    });
  }

  orderCompleted(orderNumber, efficiency) {
    const message = `Order ${orderNumber} completed with ${efficiency}% efficiency`;
    this.success(message, {
      title: 'Order Completed'
    });
  }

  orderStopped(orderNumber, reason) {
    this.warning(`Order ${orderNumber} stopped: ${reason}`, {
      title: 'Production Stopped'
    });
  }
}

// Create singleton instance
window.NotificationService = new NotificationService();

// Convenience methods
window.notify = {
  success: (msg, opts) => window.NotificationService.success(msg, opts),
  error: (msg, opts) => window.NotificationService.error(msg, opts),
  warning: (msg, opts) => window.NotificationService.warning(msg, opts),
  info: (msg, opts) => window.NotificationService.info(msg, opts),
  confirm: (msg, opts) => window.NotificationService.confirm(msg, opts),
  dismiss: (id) => window.NotificationService.dismiss(id),
  dismissAll: () => window.NotificationService.dismissAll()
};
