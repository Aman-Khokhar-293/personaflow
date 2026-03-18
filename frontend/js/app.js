/**
 * PersonaFlow - Main Application
 * Core initialization and state management
 */

const App = {
    state: {
        user: null,
        currentPage: null,
        isAuthenticated: false
    },

    /**
     * Initialize the application
     */
    init() {
        this.checkAuth();
        this.setupEventListeners();
        Router.init();
    },

    /**
     * Check if user is authenticated
     */
    async checkAuth() {
        try {
            const response = await API.get('/auth/me');
            if (response.user) {
                this.state.user = response.user;
                this.state.isAuthenticated = true;
                Sidebar.updateUser(response.user);
                // Initialize notification bell for already-logged-in users
                setTimeout(() => Notifications.init(), 500);
            }
        } catch (error) {
            this.state.isAuthenticated = false;
            this.state.user = null;
        }
    },

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Logout button
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.logout();
        });

        // Modal backdrop click
        document.querySelector('.modal-backdrop')?.addEventListener('click', () => {
            Modal.close();
        });

        // Modal close button
        document.getElementById('modal-close')?.addEventListener('click', () => {
            Modal.close();
        });
    },

    /**
     * Login user
     */
    login(user) {
        this.state.user = user;
        this.state.isAuthenticated = true;
        Sidebar.show();
        Sidebar.updateUser(user);
        // Start notification polling and show onboarding for new users
        setTimeout(() => {
            Notifications.init();
            Onboarding.show();
        }, 600);
        const redirect = sessionStorage.getItem('redirectAfterLogin');
        sessionStorage.removeItem('redirectAfterLogin');
        Router.navigate(redirect || '/dashboard');
    },

    /**
     * Logout user
     */
    async logout() {
        try {
            await API.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.state.user = null;
        this.state.isAuthenticated = false;
        Notifications.stop();
        Sidebar.hide();
        Router.navigate('/login');
    },

    /**
     * Show loading overlay
     */
    showLoading() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        document.getElementById('loading-overlay')?.remove();
    },

    /**
     * Get initials from name
     */
    getInitials(name) {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    },

    /**
     * Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    },

    /**
     * Format time
     */
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    },

    /**
     * Format relative time
     */
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return this.formatDate(dateString);
    }
};
