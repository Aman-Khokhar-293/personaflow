/**
 * PersonaFlow - Sidebar Component
 */

const Sidebar = {
    element: null,

    /**
     * Initialize sidebar
     */
    init() {
        this.element = document.getElementById('sidebar');
        this.initDarkMode();
        this.initMobileToggle();
    },

    /**
     * Show sidebar
     */
    show() {
        if (!this.element) this.init();
        this.element.classList.remove('hidden');
        const toggle = document.getElementById('mobile-menu-toggle');
        if (toggle) toggle.classList.remove('hidden');
    },

    /**
     * Hide sidebar
     */
    hide() {
        if (!this.element) this.init();
        this.element.classList.add('hidden');
        const toggle = document.getElementById('mobile-menu-toggle');
        if (toggle) toggle.classList.add('hidden');
    },

    /**
     * Set active nav item
     */
    setActive(page) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const itemPage = item.dataset.page;
            if (itemPage === page || (page === 'agent-detail' && itemPage === 'agents')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        // Close sidebar on mobile after navigating
        if (this.element) {
            this.element.classList.remove('mobile-open');
            const toggleIcon = document.querySelector('#mobile-menu-toggle i');
            if (toggleIcon) {
                toggleIcon.className = 'fas fa-bars';
            }
        }
    },

    /**
     * Initialize mobile sidebar hamburger toggle
     */


    initMobileToggle() {
        const toggle = document.getElementById('mobile-menu-toggle');
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.element) {
                    const isOpen = this.element.classList.toggle('mobile-open');
                    const icon = toggle.querySelector('i');
                    if (icon) {
                        icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
                    }
                }
            });

            document.addEventListener('click', (e) => {
                if (this.element && this.element.classList.contains('mobile-open')) {
                    if (!this.element.contains(e.target) && !toggle.contains(e.target)) {
                        this.element.classList.remove('mobile-open');
                        const icon = toggle.querySelector('i');
                        if (icon) {
                            icon.className = 'fas fa-bars';
                        }
                    }
                }
            });
        }
    },

    /**
     * Update user info
     */
    updateUser(user) {
        const avatar = document.getElementById('user-avatar');
        const name = document.getElementById('user-name');
        const email = document.getElementById('user-email');

        if (avatar && user) {
            avatar.textContent = App.getInitials(user.name);
            avatar.style.backgroundColor = user.avatar_color;
        }

        if (name && user) {
            name.textContent = user.name;
        }

        if (email && user) {
            email.textContent = user.email || '';
        }
    },

    /**
     * Initialize dark mode from localStorage and bind toggle
     */
    initDarkMode() {
        const saved = localStorage.getItem('personaflow-theme');
        const toggle = document.getElementById('dark-mode-toggle');
        const icon = document.getElementById('dark-mode-icon');

        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (toggle) toggle.classList.add('active');
            if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
        }

        if (toggle) {
            toggle.addEventListener('click', () => this.toggleDarkMode());
        }
    },

    /**
     * Toggle dark mode on/off
     */
    toggleDarkMode() {
        const html = document.documentElement;
        const toggle = document.getElementById('dark-mode-toggle');
        const icon = document.getElementById('dark-mode-icon');
        const isDark = html.getAttribute('data-theme') === 'dark';

        if (isDark) {
            html.removeAttribute('data-theme');
            localStorage.setItem('personaflow-theme', 'light');
            if (toggle) toggle.classList.remove('active');
            if (icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
        } else {
            html.setAttribute('data-theme', 'dark');
            localStorage.setItem('personaflow-theme', 'dark');
            if (toggle) toggle.classList.add('active');
            if (icon) { icon.classList.add('fa-sun'); icon.classList.remove('fa-moon'); }
        }
    }
};
