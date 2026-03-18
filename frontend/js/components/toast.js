/**
 * PersonaFlow - Toast Notification Component
 */

const Toast = {
    container: null,

    /**
     * Initialize toast container
     */
    init() {
        this.container = document.getElementById('toast-container');
    },

    /**
     * Show toast notification
     */
    show(type, title, message = '', duration = 4000) {
        if (!this.container) this.init();

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ'}</span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close">&times;</button>
        `;

        this.container.appendChild(toast);

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.remove(toast);
        });

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        return toast;
    },

    /**
     * Remove toast
     */
    remove(toast) {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    },

    /**
     * Success toast
     */
    success(title, message = '') {
        return this.show('success', title, message);
    },

    /**
     * Error toast
     */
    error(title, message = '') {
        return this.show('error', title, message);
    },

    /**
     * Warning toast
     */
    warning(title, message = '') {
        return this.show('warning', title, message);
    },

    /**
     * Info toast
     */
    info(title, message = '') {
        return this.show('info', title, message);
    }
};
