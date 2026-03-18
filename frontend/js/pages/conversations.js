/**
 * PersonaFlow - Conversations List Page
 */

const ConversationsPage = {
    conversations: [],
    filter: 'all',

    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Conversations</h1>
                    <p class="page-subtitle">View and manage all agent conversations</p>
                </div>
            </div>
            
            <div class="card mb-4">
                <div class="flex items-center gap-4">
                    <div class="search-input-wrapper" style="flex: 1; max-width: 400px; position: relative;">
                        <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400); font-size: 0.875rem;"></i>
                        <input type="text" class="form-input" id="search-conversations" placeholder="Search conversations..." style="padding-left: 36px;">
                    </div>
                    <select class="form-select" id="filter-status" style="width: auto;">
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                    </select>
                    <select class="form-select" id="filter-agent" style="width: auto;">
                        <option value="all">All Agents</option>
                    </select>
                </div>
            </div>
            
            <div id="conversations-list">
                <div class="empty-state">
                    <div class="spinner"></div>
                </div>
            </div>
        `;

        this.loadConversations();
        this.loadAgents();
        this.setupListeners();
    },

    async loadConversations() {
        try {
            const { conversations } = await API.get('/conversations');
            this.conversations = conversations;
            this.renderList();
        } catch (error) {
            Toast.error('Failed to load conversations');
        }
    },

    async loadAgents() {
        try {
            const { agents } = await API.get('/agents');
            const select = document.getElementById('filter-agent');
            if (select) {
                agents.forEach(agent => {
                    const option = document.createElement('option');
                    option.value = agent.id;
                    option.textContent = agent.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load agents for filter');
        }
    },

    setupListeners() {
        document.getElementById('search-conversations')?.addEventListener('input', () => this.renderList());
        document.getElementById('filter-status')?.addEventListener('change', () => this.renderList());
        document.getElementById('filter-agent')?.addEventListener('change', () => this.renderList());

        // Close any open menus on body click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.conv-menu-wrapper')) {
                document.querySelectorAll('.conv-dropdown-menu.open').forEach(m => m.classList.remove('open'));
            }
        });
    },

    renderList() {
        const container = document.getElementById('conversations-list');
        const search = document.getElementById('search-conversations')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('filter-status')?.value || 'all';
        const agentFilter = document.getElementById('filter-agent')?.value || 'all';

        let filtered = this.conversations.filter(conv => {
            if (search && !conv.participant_name?.toLowerCase().includes(search)) {
                return false;
            }
            if (statusFilter !== 'all' && conv.status !== statusFilter) {
                return false;
            }
            if (agentFilter !== 'all' && conv.agent_id !== parseInt(agentFilter)) {
                return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="empty-state">
                        <div class="empty-icon">💬</div>
                        <div class="empty-title">No conversations found</div>
                        <div class="empty-message">Start a chat with one of your agents</div>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="conv-list-container">
                ${filtered.map(conv => `
                    <div class="conv-list-item">
                        <div class="conv-avatar" style="background: ${conv.agent_color || 'var(--primary-500)'};">
                            ${(conv.participant_name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div class="conv-info">
                            <div class="conv-name">
                                ${conv.participant_name || 'Anonymous'}
                                <span class="badge ${conv.status}" style="margin-left: 0.5rem;">${conv.status === 'active' ? 'Active' : conv.status}</span>
                            </div>
                            <div class="conv-meta">
                                with ${conv.agent_name} &nbsp; <i class="fas fa-comment" style="font-size: 0.7rem; opacity: 0.5;"></i> ${conv.message_count || 0}
                            </div>
                        </div>
                        <div class="conv-date">
                            ${this.formatDateTime(conv.started_at || conv.last_message_at)}
                        </div>
                        <a href="#/${conv.status === 'active' ? 'chat' : 'conversations'}/${conv.id}" class="btn btn-outline btn-sm conv-view-btn" onclick="event.stopPropagation();">View</a>
                        <div class="conv-menu-wrapper">
                            <button class="conv-menu-btn" onclick="event.stopPropagation(); ConversationsPage.toggleMenu(this);">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="conv-dropdown-menu">
                                <button class="conv-dropdown-item" onclick="event.stopPropagation(); ConversationsPage.generateReport(${conv.id});">
                                    <i class="fas fa-file-alt"></i> Generate Report
                                </button>
                                <button class="conv-dropdown-item danger" onclick="event.stopPropagation(); ConversationsPage.deleteConversation(${conv.id});">
                                    <i class="fas fa-trash-alt"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    toggleMenu(btn) {
        const menu = btn.nextElementSibling;
        // Close all other menus
        document.querySelectorAll('.conv-dropdown-menu.open').forEach(m => {
            if (m !== menu) m.classList.remove('open');
        });
        menu.classList.toggle('open');
    },

    async generateReport(convId) {
        try {
            document.querySelectorAll('.conv-dropdown-menu.open').forEach(m => m.classList.remove('open'));
            Toast.info('Generating report...');
            const result = await API.post(`/reports/generate/${convId}`);
            Toast.success(result.message || 'Report generated successfully');
            if (result.report_id) {
                Router.navigate(`/reports/${result.report_id}`);
            }
        } catch (error) {
            Toast.error('Failed to generate report', error.message);
        }
    },

    async deleteConversation(convId) {
        document.querySelectorAll('.conv-dropdown-menu.open').forEach(m => m.classList.remove('open'));
        if (!confirm('Are you sure you want to delete this conversation?')) return;
        try {
            await API.delete(`/conversations/${convId}`);
            Toast.success('Conversation deleted');
            this.loadConversations();
        } catch (error) {
            Toast.error('Failed to delete conversation', error.message);
        }
    },

    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `<div style="font-size: 0.8125rem; color: var(--gray-500);">${dateStr}</div><div style="font-size: 0.75rem; color: var(--gray-400);">${timeStr}</div>`;
    }
};
