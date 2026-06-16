/**
 * PersonaFlow - Dashboard Page
 */

const DashboardPage = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Dashboard</h1>
                    <p class="page-subtitle">Welcome back! Here's what's happening with your agents.</p>
                </div>
                <a href="#/agents/new" class="btn btn-primary btn-new-agent">
                    <span>+</span> Create Agent
                </a>
            </div>
            
            <!-- Stats Row -->
            <div class="stats-grid">
                <div class="card stat-card">
                    <div class="stat-content">
                        <span class="stat-label">Total Agents</span>
                        <span class="stat-value" id="stat-total-agents">-</span>
                    </div>
                    <div class="stat-icon-wrapper purple">
                        <i class="fas fa-robot">🤖</i>
                    </div>
                </div>
                
                <div class="card stat-card">
                    <div class="stat-content">
                        <span class="stat-label">Active Agents</span>
                        <span class="stat-value" id="stat-active-agents">-</span>
                    </div>
                    <div class="stat-icon-wrapper green">
                        <i class="fas fa-check-circle">✨</i>
                    </div>
                </div>
                
                <div class="card stat-card">
                    <div class="stat-content">
                        <span class="stat-label">Total Conversations</span>
                        <span class="stat-value" id="stat-conversations">-</span>
                    </div>
                    <div class="stat-icon-wrapper blue">
                        <i class="fas fa-comments">💬</i>
                    </div>
                </div>
                
                <div class="card stat-card">
                    <div class="stat-content">
                        <span class="stat-label">Active Share Links</span>
                        <span class="stat-value" id="stat-share-links">-</span>
                    </div>
                    <div class="stat-icon-wrapper orange">
                        <i class="fas fa-share-alt">🔗</i>
                    </div>
                </div>
            </div>
            
            <!-- Main Content Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                
                <!-- Recent Agents -->
                <div class="card">
                    <div class="card-header" style="padding: 1.5rem; border-bottom: 1px solid var(--gray-100);">
                        <div class="section-title">Recent Agents</div>
                        <a href="#/agents" class="btn-link">View all &rarr;</a>
                    </div>
                    <div class="list-group" id="recent-agents" style="padding: 1rem;">
                        <div class="empty-state" style="padding: 2rem;">
                            <div class="spinner"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Recent Conversations -->
                <div class="card">
                    <div class="card-header" style="padding: 1.5rem; border-bottom: 1px solid var(--gray-100);">
                        <div class="section-title">Recent Conversations</div>
                        <a href="#/conversations" class="btn-link">View all &rarr;</a>
                    </div>
                    <div class="list-group" id="recent-conversations" style="padding: 1rem;">
                        <div class="empty-state" style="padding: 2rem;">
                            <div class="spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.loadData();
    },

    async loadData() {
        try {
            const data = await API.get('/dashboard/stats');

            // Update stats animation
            this.animateValue('stat-total-agents', 0, data.stats.total_agents, 1000);
            this.animateValue('stat-active-agents', 0, data.stats.active_agents, 1000);
            this.animateValue('stat-conversations', 0, data.stats.conversations, 1000);
            this.animateValue('stat-share-links', 0, data.stats.share_links, 1000);

            // Render recent agents
            const agentsContainer = document.getElementById('recent-agents');
            if (data.recent_agents.length === 0) {
                agentsContainer.innerHTML = `
                    <div class="empty-state" style="padding: 2rem; text-align: center;">
                        <div style="font-size: 2rem; margin-bottom: 1rem; color: var(--gray-400);"><i class="fas fa-robot"></i></div>
                        <div style="color: var(--gray-500);">No agents created yet</div>
                        <a href="#/agents/new" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Create Agent</a>
                    </div>
                `;
            } else {
                agentsContainer.innerHTML = data.recent_agents.map(agent => `
                    <a href="#/agents/${agent.id}" class="list-item">
                        <div class="list-item-icon" style="background: ${agent.color}20; color: ${agent.color}; display: flex; align-items: center; justify-content: center;">
                            ${App.getAgentIconHtml(agent.icon)}
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${agent.name}</div>
                            <div class="list-item-subtitle">${agent.role}</div>
                        </div>
                        <span class="badge ${agent.status === 'active' ? 'active' : 'inactive'}">
                            ${agent.status}
                        </span>
                        <div style="color: var(--gray-400);">→</div>
                    </a>
                `).join('');
            }

            // Render recent conversations
            const convsContainer = document.getElementById('recent-conversations');
            if (data.recent_conversations.length === 0) {
                convsContainer.innerHTML = `
                    <div class="empty-state" style="padding: 2rem; text-align: center;">
                        <div style="font-size: 2rem; margin-bottom: 1rem; color: var(--gray-400);"><i class="fas fa-comments"></i></div>
                        <div style="color: var(--gray-500);">No conversations yet</div>
                    </div>
                `;
            } else {
                convsContainer.innerHTML = data.recent_conversations.map(conv => `
                    <a href="#/conversations/${conv.id}" class="list-item">
                        <div class="list-item-icon" style="background: ${conv.agent_color}20; color: ${conv.agent_color}; font-size: 1rem;">
                            ${conv.participant_name ? conv.participant_name.charAt(0) : 'A'}
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${conv.participant_name || 'Anonymous'}</div>
                            <div class="list-item-subtitle">
                                with ${conv.agent_name} • <span style="font-size: 0.75em; color: var(--gray-400);">${this.formatDate(conv.last_message_at)}</span>
                            </div>
                        </div>
                        <span class="badge active">active</span>
                    </a>
                `).join('');
            }

        } catch (error) {
            console.error(error);
            Toast.error('Failed to load dashboard data', error.message);
        }
    },

    animateValue(id, start, end, duration) {
        if (start === end) return;
        const range = end - start;
        let current = start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));
        const obj = document.getElementById(id);

        const timer = setInterval(() => {
            current += increment;
            obj.innerHTML = current;
            if (current == end) {
                clearInterval(timer);
            }
        }, Math.max(stepTime, 50)); // Cap speed

        // Instant set if too slow
        if (range > 20) {
            obj.innerHTML = end;
            clearInterval(timer);
        }
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
};
