/**
 * PersonaFlow - Router
 * Client-side routing for SPA navigation
 */

const Router = {
    routes: {
        '/login': { page: 'login', auth: false, title: 'Login' },
        '/signup': { page: 'signup', auth: false, title: 'Sign Up' },
        '/forgot-password': { page: 'forgot-password', auth: false, title: 'Forgot Password' },
        '/dashboard': { page: 'dashboard', auth: true, title: 'Dashboard' },
        '/agents': { page: 'agents', auth: true, title: 'My Agents' },
        '/agents/new': { page: 'agent-wizard', auth: true, title: 'Create Agent' },
        '/agents/:id': { page: 'agent-detail', auth: true, title: 'Agent Details' },
        '/agents/:id/edit': { page: 'agent-wizard', auth: true, title: 'Edit Agent' },
        '/chat/:id': { page: 'chat', auth: true, title: 'Chat' },
        '/video-call/:id': { page: 'video-call', auth: true, title: 'Video Call' },
        '/conversations': { page: 'conversations', auth: true, title: 'Conversations' },
        '/conversations/:id': { page: 'conversation-detail', auth: true, title: 'Conversation' },
        '/reports': { page: 'reports', auth: true, title: 'Reports' },
        '/reports/:id': { page: 'report-detail', auth: true, title: 'Report' },
        '/anchoring/:id': { page: 'anchoring', auth: true, title: 'Event Anchoring' },
        '/anchoring-remote/:id': { page: 'anchoring-remote', auth: true, title: 'Anchoring Remote Control' },
        '/share/:token': { page: 'share-access', auth: false, title: 'Shared Agent' },
        '/templates': { page: 'templates', auth: true, title: 'Templates' }
    },

    currentRoute: null,
    params: {},
    historyStack: [],

    /**
     * Initialize router
     */
    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    },

    /**
     * Handle route change
     */
    handleRoute() {
        const hash = window.location.hash.slice(1) || '/login';
        const { route, params } = this.matchRoute(hash);

        if (!route) {
            this.navigate('/login');
            return;
        }

        // Check authentication
        if (route.auth && !App.state.isAuthenticated) {
            sessionStorage.setItem('redirectAfterLogin', hash);
            this.navigate('/login');
            return;
        }

        if (!route.auth && App.state.isAuthenticated && hash !== '/share/' + params.token) {
            this.navigate('/dashboard');
            return;
        }

        // Track custom history stack
        const currentHash = window.location.hash || '#/login';
        if (this.historyStack.length === 0 || this.historyStack[this.historyStack.length - 1] !== currentHash) {
            this.historyStack.push(currentHash);
        }

        this.currentRoute = route;
        this.params = params;

        // Update page title
        document.title = `${route.title} - PersonaFlow`;

        // ── Cleanup: stop video call if navigating away from it ──
        if (this._lastPage === 'video-call' && route.page !== 'video-call') {
            if (typeof VideoCallPage !== 'undefined') {
                try { VideoCallPage.resetState(); } catch (e) { }
            }
        }
        this._lastPage = route.page;

        // Show/hide sidebar
        if (route.auth && route.page !== 'video-call' && route.page !== 'anchoring' && route.page !== 'anchoring-remote') {
            Sidebar.show();
            Sidebar.setActive(route.page);
            document.getElementById('main-content').classList.remove('full-width');
        } else {
            Sidebar.hide();
            document.getElementById('main-content').classList.add('full-width');
        }

        // Render page
        this.renderPage(route.page, params);
    },

    /**
     * Match route to path
     */
    matchRoute(path) {
        for (const [pattern, route] of Object.entries(this.routes)) {
            const params = this.extractParams(pattern, path);
            if (params !== null) {
                return { route, params };
            }
        }
        return { route: null, params: {} };
    },

    /**
     * Extract params from URL
     */
    extractParams(pattern, path) {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');

        if (patternParts.length !== pathParts.length) {
            return null;
        }

        const params = {};

        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                params[patternParts[i].slice(1)] = pathParts[i];
            } else if (patternParts[i] !== pathParts[i]) {
                return null;
            }
        }

        return params;
    },

    /**
     * Navigate to path
     */
    navigate(path) {
        window.location.hash = path;
    },

    /**
     * Go back
     */
    back() {
        if (this.historyStack.length > 1) {
            this.historyStack.pop(); // Remove current route
            const previousHash = this.historyStack.pop(); // Get previous route
            window.location.hash = previousHash;
        } else {
            window.location.hash = '#/dashboard';
        }
    },

    /**
     * Render page content
     */
    renderPage(page, params) {
        const mainContent = document.getElementById('main-content');

        switch (page) {
            case 'login':
                LoginPage.render(mainContent);
                break;
            case 'signup':
                SignupPage.render(mainContent);
                break;
            case 'forgot-password':
                ForgotPasswordPage.render(mainContent);
                break;
            case 'dashboard':
                DashboardPage.render(mainContent);
                break;
            case 'agents':
                AgentsPage.render(mainContent);
                break;
            case 'agent-wizard':
                AgentWizardPage.render(mainContent, params.id);
                break;
            case 'agent-detail':
                AgentDetailPage.render(mainContent, params.id);
                break;
            case 'chat':
                ChatPage.render(mainContent, params.id);
                break;
            case 'video-call':
                VideoCallPage.render(mainContent, params.id);
                break;
            case 'conversations':
                ConversationsPage.render(mainContent);
                break;
            case 'conversation-detail':
                ConversationDetailPage.render(mainContent, params.id);
                break;
            case 'reports':
                ReportsPage.render(mainContent);
                break;
            case 'report-detail':
                ReportDetailPage.render(mainContent, params.id);
                break;
            case 'share-access':
                ShareAccessPage.render(mainContent, params.token);
                break;
            case 'anchoring':
                AnchoringPage.render(mainContent, params.id);
                break;
            case 'anchoring-remote':
                AnchoringRemotePage.render(mainContent, params.id);
                break;
            case 'templates':
                TemplatesPage.render(mainContent);
                break;
            default:
                mainContent.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Page Not Found</div></div>';
        }
    }
};
